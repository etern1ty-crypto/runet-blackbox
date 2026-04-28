import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { extractReportJson } from "../scripts/lib/issue.mjs";

const execFileAsync = promisify(execFile);

test("extractReportJson reads fenced json", () => {
  const report = extractReportJson("text\n```json\n{\"target\":\"github.com\"}\n```");
  assert.equal(report.target, "github.com");
});

test("extractReportJson reads raw json", () => {
  const report = extractReportJson("{\"target\":\"github.com\"}");
  assert.equal(report.target, "github.com");
});

test("extractReportJson accepts PowerShell BOM before raw json", () => {
  const report = extractReportJson("\ufeff{\"target\":\"github.com\"}");
  assert.equal(report.target, "github.com");
});

test("extractReportJson accepts PowerShell BOM inside fenced json", () => {
  const report = extractReportJson("```json\n\ufeff{\"target\":\"github.com\"}\n```");
  assert.equal(report.target, "github.com");
});

test("extractReportJson ignores text around raw object", () => {
  const report = extractReportJson("before {\"target\":\"github.com\"} after");
  assert.equal(report.target, "github.com");
});

test("extractReportJson rejects missing json", () => {
  assert.throws(() => extractReportJson("no json here"));
});

test("extractReportJson rejects malformed json", () => {
  assert.throws(() => extractReportJson("```json\n{\"target\":\n```"));
});

test("import-issue imports report bundles", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "runet-blackbox-import-"));
  const out = path.join(dir, "reports");
  const bodyFile = path.join(dir, "issue.md");
  const report = JSON.parse(await fs.readFile(new URL("./fixtures/valid-report.json", import.meta.url), "utf8"));
  const second = structuredClone(report);
  second.target = "example.com";
  second.report_id = "rbb_11111111111111111111";
  const bundle = {
    bundle_schema_version: "1.0",
    reports: [report, second]
  };
  await fs.writeFile(bodyFile, `\`\`\`json\n${JSON.stringify(bundle, null, 2)}\n\`\`\`\n`, "utf8");

  const { stdout } = await execFileAsync(process.execPath, ["scripts/import-issue.mjs", "--body-file", bodyFile, "--out", out]);
  assert.match(stdout, /2 imported/);
  const imported = await fs.readFile(path.join(out, "2026-04-27.jsonl"), "utf8");
  assert.equal(imported.trim().split(/\r?\n/).length, 2);
});
