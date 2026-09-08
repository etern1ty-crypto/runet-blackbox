#!/usr/bin/env node
import { findSensitivePaths } from "../src/privacy.js";
import { prepareReport } from "../src/report.js";
import { validateReport } from "../src/report-schema.js";
import { readJson } from "./lib/files.mjs";

const file = process.argv[2];
if (!file) {
  process.stderr.write("usage: node scripts/validate-report.mjs <report.json>\n");
  process.exit(2);
}

try {
  const raw = await readJson(file);
  const sensitivePaths = findSensitivePaths(raw);
  const report = prepareReport(raw);
  const validation = validateReport(report);
  if (!validation.valid) {
    process.stderr.write(`${validation.errors.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`${JSON.stringify({ valid: true, target: report.target, report_id: report.report_id || null, diagnosis: report.diagnosis, stripped_sensitive_paths: sensitivePaths }, null, 2)}\n`);
} catch (error) {
  process.stderr.write("report rejected: invalid JSON, schema or file; raw details omitted\n");
  process.exit(1);
}
