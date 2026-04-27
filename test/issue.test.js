import test from "node:test";
import assert from "node:assert/strict";
import { extractReportJson } from "../scripts/lib/issue.mjs";

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
