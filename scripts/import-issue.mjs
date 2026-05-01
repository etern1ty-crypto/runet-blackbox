#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { stableHash } from "../src/hash.js";
import { findSensitivePaths, sanitizeReport } from "../src/privacy.js";
import { validateReport } from "../src/report-schema.js";
import { reportDay } from "../src/time.js";
import { readText } from "./lib/files.mjs";
import { extractReportJson } from "./lib/issue.mjs";

const args = parseArgs(process.argv.slice(2));

try {
  const body = await readBody(args);
  if (Buffer.byteLength(body, "utf8") > 262144) {
    throw new Error("issue body is too large; paste one sanitized report only");
  }
  const outDir = args.out || "data/reports";
  await fs.mkdir(outDir, { recursive: true });
  const payload = extractReportJson(body);
  const rawReports = Array.isArray(payload?.reports) ? payload.reports : [payload];
  if (!rawReports.length) {
    throw new Error("issue body does not contain any reports");
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

  for (const [index, rawReport] of rawReports.entries()) {
    result.stripped_sensitive_fields += findSensitivePaths(rawReport).length;
    let report = null;
    try {
      report = sanitizeReport(rawReport);
    } catch (error) {
      result.rejected += 1;
      result.rejected_reports.push(rejectedReport(index, [`sanitizer failed: ${error.message}`]));
      continue;
    }

    const validation = validateReport(report);
    if (!validation.valid) {
      result.rejected += 1;
      result.rejected_reports.push(rejectedReport(index, validation.errors));
      continue;
    }

    const outFile = path.join(outDir, `${reportDay(report.timestamp_utc)}.jsonl`);
    const imported = await appendIfNew(outFile, report);
    if (imported) result.imported += 1;
    else result.duplicates += 1;
    result.accepted_reports.push({
      target: report.target,
      report_id: report.report_id || null,
      diagnosis: report.diagnosis.category,
      imported
    });
  }

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
    rejected_reports: [{ index: null, errors: [error.message] }]
  };
  await writeResultFiles(args, result).catch(() => {});
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}

async function appendIfNew(outFile, report) {
  const line = JSON.stringify(report);
  const hash = report.report_id || stableHash(report);
  let existing = "";
  try {
    existing = await fs.readFile(outFile, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  for (const existingLine of existing.split(/\r?\n/).filter(Boolean)) {
    const existingReport = JSON.parse(existingLine);
    if ((existingReport.report_id || stableHash(existingReport)) === hash) {
      return false;
    }
  }
  await fs.appendFile(outFile, `${line}\n`, "utf8");
  return true;
}

async function readBody(args) {
  if (args.bodyFile) {
    return readText(args.bodyFile);
  }
  if (args.githubEvent) {
    const event = JSON.parse(await readText(args.githubEvent));
    return event.issue?.body || "";
  }
  throw new Error("use --body-file or --github-event");
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--body-file") parsed.bodyFile = argv[++i];
    else if (token === "--github-event") parsed.githubEvent = argv[++i];
    else if (token === "--out") parsed.out = argv[++i];
    else if (token === "--summary-file") parsed.summaryFile = argv[++i];
    else if (token === "--result-file") parsed.resultFile = argv[++i];
    else throw new Error(`unknown option: ${token}`);
  }
  return parsed;
}

async function writeResultFiles(args, result) {
  if (args.resultFile) {
    await fs.writeFile(args.resultFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  if (args.summaryFile) {
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
