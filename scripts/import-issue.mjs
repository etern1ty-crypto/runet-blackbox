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
  const rawReport = extractReportJson(body);
  const sensitivePaths = findSensitivePaths(rawReport);
  const report = sanitizeReport(rawReport);
  const validation = validateReport(report);
  if (!validation.valid) {
    throw new Error(`invalid report:\n${validation.errors.join("\n")}`);
  }

  const day = reportDay(report.timestamp_utc);
  const outDir = args.out || "data/reports";
  const outFile = path.join(outDir, `${day}.jsonl`);
  await fs.mkdir(outDir, { recursive: true });
  const imported = await appendIfNew(outFile, report);
  const privacyNote = sensitivePaths.length ? `; stripped ${sensitivePaths.length} sensitive field(s)` : "";
  process.stdout.write(`${imported ? "imported" : "already imported"} ${report.target} ${report.diagnosis.category} into ${outFile}${privacyNote}\n`);
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
