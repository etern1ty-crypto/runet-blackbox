#!/usr/bin/env node
import fs from "node:fs/promises";
import { findSensitivePaths, sanitizeReport } from "../src/privacy.js";
import { validateReport } from "../src/report-schema.js";

const file = process.argv[2];
if (!file) {
  process.stderr.write("usage: node scripts/validate-report.mjs <report.json>\n");
  process.exit(2);
}

try {
  const raw = JSON.parse(await fs.readFile(file, "utf8"));
  const sensitivePaths = findSensitivePaths(raw);
  const report = sanitizeReport(raw);
  const validation = validateReport(report);
  if (!validation.valid) {
    process.stderr.write(`${validation.errors.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`${JSON.stringify({ valid: true, target: report.target, report_id: report.report_id || null, diagnosis: report.diagnosis, stripped_sensitive_paths: sensitivePaths }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
