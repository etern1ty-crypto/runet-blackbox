#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { aggregateReports, domainAggregate } from "../src/aggregate.js";
import { collectFiles, readJson, readJsonl, writeJson } from "./lib/files.mjs";

const reportsDir = process.argv[2] || "data/reports";
const aggregatesDir = process.argv[3] || "data/aggregates";

const reports = await loadReports(reportsDir);
const aggregate = aggregateReports(reports);
await writeJson(path.join(aggregatesDir, "index.json"), aggregate);
await writeJson(path.join(aggregatesDir, "latest.json"), aggregate.latest_reports);

const domainDir = path.join(aggregatesDir, "domains");
await fs.mkdir(domainDir, { recursive: true });
for (const domain of aggregate.domains) {
  await writeJson(path.join(domainDir, `${safeFileName(domain.key)}.json`), domainAggregate(reports, domain.key));
}

process.stdout.write(`aggregated ${aggregate.total_reports} reports across ${aggregate.total_targets} targets\n`);

async function loadReports(root) {
  const files = await collectFiles(root, (file) => file.endsWith(".jsonl") || file.endsWith(".json"));
  const loaded = [];
  for (const file of files) {
    if (file.endsWith(".jsonl")) loaded.push(...(await readJsonl(file)));
    else loaded.push(await readJson(file));
  }
  return loaded;
}

function safeFileName(value) {
  return value.replace(/[^a-z0-9.-]/gi, "_");
}
