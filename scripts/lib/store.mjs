import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { prepareReport } from "../../src/report.js";
import { reportDay } from "../../src/time.js";
import { atomicWriteFile } from "../../cli/internal/output.js";

/** Serialize local writers. Stale locks are never stolen automatically. */
export async function withStoreLock(directory, operation, timeoutMs = 5000) {
  await fs.mkdir(directory, { recursive: true });
  const lock = path.join(directory, ".import.lock");
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try { await fs.mkdir(lock); break; }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      if (Date.now() >= deadline) throw Object.assign(new Error("report store is busy; inspect stale .import.lock before retrying"), { code: "ERR_STORE_LOCKED" });
      await delay(25);
    }
  }
  try { return await operation(); }
  finally { await fs.rmdir(lock); }
}

export async function appendReport(directory, report) {
  const file = path.join(directory, reportDay(report.timestamp_utc) + ".jsonl");
  let existing = [];
  try {
    const stat = await fs.stat(file);
    if (stat.size > 32 * 1024 * 1024) throw new Error("daily report shard exceeds 32 MiB; rotate the store");
    existing = (await fs.readFile(file, "utf8")).split(/\r?\n/).filter(line => line.trim()).map(line => prepareReport(JSON.parse(line)));
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (existing.some(item => item.report_id === report.report_id)) return false;
  const deduplicated = new Map(existing.map(item => [item.report_id, item]));
  deduplicated.set(report.report_id, report);
  await atomicWriteFile(file, [...deduplicated.values()].map(item => JSON.stringify(item)).join("\n") + "\n");
  return true;
}
