import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readJson, readJsonl, stripBom } from "../scripts/lib/files.mjs";

test("stripBom removes a leading UTF-8 BOM", () => {
  assert.equal(stripBom("\ufeff{\"ok\":true}"), "{\"ok\":true}");
  assert.equal(stripBom("{\"ok\":true}"), "{\"ok\":true}");
});

test("readJson accepts PowerShell UTF-8 BOM files", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "runet-blackbox-"));
  const file = path.join(dir, "report.json");
  await fs.writeFile(file, "\ufeff{\"target\":\"github.com\"}", "utf8");

  const report = await readJson(file);
  assert.equal(report.target, "github.com");
});

test("readJsonl accepts PowerShell UTF-8 BOM on first line", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "runet-blackbox-"));
  const file = path.join(dir, "reports.jsonl");
  await fs.writeFile(file, "\ufeff{\"target\":\"github.com\"}\n{\"target\":\"npmjs.com\"}\n", "utf8");

  const reports = await readJsonl(file);
  assert.deepEqual(
    reports.map((report) => report.target),
    ["github.com", "npmjs.com"]
  );
});
