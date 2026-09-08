#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { aggregateReports, domainAggregate } from "../src/aggregate.js";
import { buildWeeklyDigest, digestFileName } from "../src/digest.js";
import { buildOverviewShareCard, buildTargetShareCard } from "../src/share-card.js";
import { collectFiles, readJson, readText, writeJson } from "./lib/files.mjs";

const args = process.argv.slice(2);
const reportsDir = args[0] || "data/reports";
const aggregatesDir = args[1] || "data/aggregates";
const hours = args[2] === undefined ? 24 : Number(args[2]);
if (args.length > 3 || !Number.isFinite(hours) || hours <= 0 || hours > 8760) throw new Error("usage: node scripts/aggregate.mjs [reports-dir] [aggregates-dir] [window-hours:1..8760]");
const inputPath = path.resolve(reportsDir);
const outputPath = path.resolve(aggregatesDir);
if (inputPath === outputPath || inputPath.startsWith(outputPath + path.sep) || outputPath.startsWith(inputPath + path.sep)) throw new Error("report and aggregate directories must not overlap");
const reports = [];
let parseFailures = 0;
const files = await collectFiles(reportsDir, file => /\.jsonl?$/.test(file));
for (const file of files) {
  if ((await fs.stat(file)).size > 32 * 1024 * 1024) throw new Error("report shard exceeds 32 MiB");
  if (file.endsWith(".jsonl")) {
    const lines = (await readText(file)).split(/\r?\n/).filter(line => line.trim());
    for (const line of lines) {
      try { reports.push(JSON.parse(line)); } catch { parseFailures++; }
    }
  } else {
    try { const item = await readJson(file); reports.push(...(Array.isArray(item?.reports) ? item.reports : [item])); }
    catch { parseFailures++; }
  }
  if (reports.length > 100000) throw new Error("report count exceeds the local-store limit (100000)");
}
if (parseFailures) throw new Error(`refusing to publish incomplete aggregates: ${parseFailures} malformed JSON record(s)`);
const now = new Date();
const options = { now, windowHours: hours };
const aggregate = aggregateReports(reports, options);
// Only directories owned by the generator are replaced. Never delete an arbitrary output root.
for (const child of ["domains", "cards"]) await fs.rm(path.join(aggregatesDir, child), { force: true, recursive: true });
await writeJson(path.join(aggregatesDir, "index.json"), aggregate);
await writeJson(path.join(aggregatesDir, "latest.json"), aggregate.latest_reports);
await fs.mkdir(path.join(aggregatesDir, "cards"), { recursive: true });
await fs.writeFile(path.join(aggregatesDir, "cards/overview.svg"), buildOverviewShareCard(aggregate));
for (const domain of aggregate.domains) {
  const stem = domain.key.replace(/[^a-z0-9.-]/gi, "_");
  await writeJson(path.join(aggregatesDir, "domains", stem + ".json"), domainAggregate(reports, domain.key, options));
  await fs.writeFile(path.join(aggregatesDir, "cards", stem + ".svg"), buildTargetShareCard(domain, aggregate));
}
const digestDir = path.join(path.dirname(aggregatesDir), "digests");
await fs.mkdir(digestDir, { recursive: true });
const weekStart = new Date(now);
weekStart.setUTCHours(0, 0, 0, 0);
weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
const weekly = aggregateReports(reports.filter(report => Date.parse(report?.timestamp_utc) >= weekStart.getTime()), { now, windowHours: 168 });
weekly.window_start = weekStart.toISOString();
await fs.writeFile(path.join(digestDir, digestFileName(now)), buildWeeklyDigest(weekly));
console.log(JSON.stringify({ total_reports: aggregate.total_reports, total_targets: aggregate.total_targets, window_hours: hours, excluded: aggregate.excluded }));
