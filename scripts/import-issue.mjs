#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { prepareReport } from "../src/report.js";
import { withStoreLock, appendReport } from "./lib/store.mjs";
import { findSensitivePaths } from "../src/privacy.js";
import { readText } from "./lib/files.mjs";
import { extractReportJson } from "./lib/issue.mjs";

let args = {};

try {
  args = parseArgs(process.argv.slice(2));
  const body = await readBody(args);
  if (Buffer.byteLength(body, "utf8") > 262144) {
    throw new Error("issue body is too large; paste one sanitized report only");
  }
  const outDir = args.out || "data/reports";
  await fs.mkdir(outDir, { recursive: true });
  const payload = extractReportJson(body);
  const rawReports = Array.isArray(payload?.reports) ? payload.reports : [payload];
  if (!rawReports.length || rawReports.length > 32) {
    throw new Error("issue body must contain 1..32 reports");
  }

  const result = {
    status: "accepted",
    imported: 0,
    duplicates: 0,
    rejected: 0,
    stripped_sensitive_fields: 0,
    accepted_reports: [],
    rejected_reports: []
  };

  await withStoreLock(outDir, async () => {
  for (const [index, rawReport] of rawReports.entries()) {
    result.stripped_sensitive_fields += findSensitivePaths(rawReport).length;
    let report = null;
    try {
      report = prepareReport(rawReport);
      if (Date.parse(report.timestamp_utc) > Date.now() + 5 * 60000) throw new Error("report timestamp is in the future");
    } catch (error) {
      result.rejected += 1;
      result.rejected_reports.push(rejectedReport(index, ["report failed privacy/schema validation; regenerate with the current CLI"]));
      continue;
    }

    const imported = await appendReport(outDir, report);
    if (imported) result.imported += 1;
    else result.duplicates += 1;
    result.accepted_reports.push({
      target: report.target,
      report_id: report.report_id || null,
      diagnosis: report.diagnosis.category,
      imported
    });
  }

  });

  if (result.rejected > 0 && result.imported === 0 && result.duplicates === 0) {
    result.status = "rejected";
  } else if (result.rejected > 0) {
    result.status = "partial";
  }
  await writeResultFiles(args, result);

  const privacyNote = result.stripped_sensitive_fields ? `; stripped ${result.stripped_sensitive_fields} sensitive field(s)` : "";
  process.stdout.write(`import complete: ${result.imported} imported, ${result.duplicates} duplicate${result.duplicates === 1 ? "" : "s"}, ${result.rejected} rejected${privacyNote}\n`);
  if (result.status === "rejected") {
    process.exit(1);
  }
} catch (error) {
  const result = {
    status: "rejected",
    imported: 0,
    duplicates: 0,
    rejected: 1,
    stripped_sensitive_fields: 0,
    accepted_reports: [],
    rejected_reports: [{ index: null, errors: ["import failed; check input format, size limits and store permissions"] }]
  };
  await writeResultFiles(args, result).catch(() => {});
  process.stderr.write(`import failed (${error.code || "ERR_IMPORT"}); raw input omitted\n`);
  process.exit(1);
}

async function readBody(args) {
  if (args.bodyFile) {
    return boundedRead(args.bodyFile, 262144);
  }
  if (args.githubEvent) {
    const event = JSON.parse(await boundedRead(args.githubEvent, 2 * 1024 * 1024));
    return event.issue?.body || "";
  }
  throw new Error("use --body-file or --github-event");
}

function parseArgs(argv) {
  const keys = { "--body-file": "bodyFile", "--github-event": "githubEvent", "--out": "out", "--summary-file": "summaryFile", "--result-file": "resultFile" };
  const parsed = {};
  for (let i = 0; i < argv.length; i++) {
    const key = keys[argv[i]];
    const value = argv[++i];
    if (!key || !value || value.startsWith("--") || parsed[key]) throw new Error("invalid import arguments");
    parsed[key] = value;
  }
  if (Boolean(parsed.bodyFile) === Boolean(parsed.githubEvent)) throw new Error("select one body source");
  const files = [parsed.bodyFile, parsed.githubEvent, parsed.summaryFile, parsed.resultFile].filter(Boolean).map(file => path.resolve(file));
  if (new Set(files).size !== files.length) throw new Error("input and result paths must be distinct");
  return parsed;
}

async function boundedRead(file, limit) {
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size > limit) throw new Error("input too large or not a regular file");
  const text = await readText(file);
  if (Buffer.byteLength(text) > limit) throw new Error("input too large");
  return text;
}

async function writeResultFiles(args, result) {
  if (args.resultFile) {
    await fs.mkdir(path.dirname(args.resultFile), { recursive: true });
    await fs.writeFile(args.resultFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  if (args.summaryFile) {
    await fs.mkdir(path.dirname(args.summaryFile), { recursive: true });
    await fs.writeFile(args.summaryFile, buildImportSummary(result), "utf8");
  }
}

function buildImportSummary(result) {
  const lines = [];
  const accepted = result.status === "accepted" || result.status === "partial";
  lines.push(accepted ? "## Runet Blackbox: отчёт принят" : "## Runet Blackbox: отчёт отклонён");
  lines.push("");
  lines.push(`- Imported: ${result.imported}`);
  lines.push(`- Duplicates: ${result.duplicates}`);
  lines.push(`- Rejected: ${result.rejected}`);
  lines.push(`- Sensitive fields stripped: ${result.stripped_sensitive_fields}`);
  lines.push("");

  if (result.accepted_reports.length) {
    lines.push("### Accepted reports");
    for (const report of result.accepted_reports.slice(0, 20)) {
      const status = report.imported ? "imported" : "duplicate";
      lines.push(`- ${report.target} · ${report.diagnosis} · ${status} · ${report.report_id || "no report_id"}`);
    }
    if (result.accepted_reports.length > 20) {
      lines.push(`- ...and ${result.accepted_reports.length - 20} more`);
    }
    lines.push("");
  }

  if (result.rejected_reports.length) {
    lines.push("### Rejected reports");
    for (const report of result.rejected_reports.slice(0, 10)) {
      const label = report.index === null ? "issue body" : `report #${report.index + 1}`;
      lines.push(`- ${label}: ${report.errors.slice(0, 4).join("; ")}`);
    }
    if (result.rejected_reports.length > 10) {
      lines.push(`- ...and ${result.rejected_reports.length - 10} more`);
    }
    lines.push("");
  }

  lines.push("Privacy note: import validates and sanitizes again before writing public data. Do not paste IP addresses, headers, cookies, response bodies, packet captures, exact locations, credentials, or private URLs.");
  lines.push("");
  if (accepted) {
    lines.push("Next step: dashboard aggregates will update after the workflow commits accepted data.");
  } else {
    lines.push("Next step: rerun the CLI and paste the generated sanitized JSON or issue body without extra private logs.");
  }
  return `${lines.join("\n")}\n`;
}

function rejectedReport(index, errors) {
  return {
    index,
    errors: errors.map((error) => String(error)).slice(0, 8)
  };
}
