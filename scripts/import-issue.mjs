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

  let importedCount = 0;
  let duplicateCount = 0;
  let strippedCount = 0;
  for (const rawReport of rawReports) {
    strippedCount += findSensitivePaths(rawReport).length;
    const report = sanitizeReport(rawReport);
    const validation = validateReport(report);
    if (!validation.valid) {
      throw new Error(`invalid report for ${rawReport?.target || "unknown target"}:\n${validation.errors.join("\n")}`);
    }
    const outFile = path.join(outDir, `${reportDay(report.timestamp_utc)}.jsonl`);
    const imported = await appendIfNew(outFile, report);
    if (imported) importedCount += 1;
    else duplicateCount += 1;
  }

  const privacyNote = strippedCount ? `; stripped ${strippedCount} sensitive field(s)` : "";
  process.stdout.write(`import complete: ${importedCount} imported, ${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"}${privacyNote}\n`);
} catch (error) {
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
    else throw new Error(`unknown option: ${token}`);
  }
  return parsed;
}
