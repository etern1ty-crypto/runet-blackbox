#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { stableHash } from "../src/hash.js";
import { sanitizeReport } from "../src/privacy.js";
import { validateReport } from "../src/report-schema.js";
import { reportDay } from "../src/time.js";
import { extractReportJson } from "./lib/issue.mjs";

const args = parseArgs(process.argv.slice(2));

try {
  const body = await readBody(args);
  const rawReport = extractReportJson(body);
  const report = sanitizeReport(rawReport);
  const validation = validateReport(report);
  if (!validation.valid) {
    throw new Error(`invalid report:\n${validation.errors.join("\n")}`);
  }

  const day = reportDay(report.timestamp_utc);
  const outDir = args.out || "data/reports";
  const outFile = path.join(outDir, `${day}.jsonl`);
  await fs.mkdir(outDir, { recursive: true });
  await appendIfNew(outFile, report);
  process.stdout.write(`imported ${report.target} ${report.diagnosis.category} into ${outFile}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}

async function appendIfNew(outFile, report) {
  const line = JSON.stringify(report);
  const hash = stableHash(report);
  let existing = "";
  try {
    existing = await fs.readFile(outFile, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  for (const existingLine of existing.split(/\r?\n/).filter(Boolean)) {
    if (stableHash(JSON.parse(existingLine)) === hash) {
      return;
    }
  }
  await fs.appendFile(outFile, `${line}\n`, "utf8");
}

async function readBody(args) {
  if (args.bodyFile) {
    return fs.readFile(args.bodyFile, "utf8");
  }
  if (args.githubEvent) {
    const event = JSON.parse(await fs.readFile(args.githubEvent, "utf8"));
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
