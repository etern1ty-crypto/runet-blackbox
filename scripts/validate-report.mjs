#!/usr/bin/env node
import fs from "node:fs/promises";
import { sanitizeReport } from "../src/privacy.js";
import { validateReport } from "../src/report-schema.js";

const file = process.argv[2];
if (!file) {
  process.stderr.write("usage: node scripts/validate-report.mjs <report.json>\n");
  process.exit(2);
}

try {
  const report = sanitizeReport(JSON.parse(await fs.readFile(file, "utf8")));
  const validation = validateReport(report);
  if (!validation.valid) {
    process.stderr.write(`${validation.errors.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`${JSON.stringify({ valid: true, target: report.target, diagnosis: report.diagnosis }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
