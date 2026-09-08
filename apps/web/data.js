/** Display-only validation; server-side canonical ingestion remains the trust boundary. */
export function assertAggregate(value) {
  const count = n => Number.isSafeInteger(n) && n >= 0;
  const record = n => n !== null && typeof n === "object" && !Array.isArray(n);
  if (!record(value) || !count(value.total_reports) || !count(value.total_targets)) throw new Error("Invalid aggregate counters");
  if (!Array.isArray(value.domains) || !Array.isArray(value.latest_reports)) throw new Error("Missing aggregate arrays");
  if (value.generated_at && !Number.isFinite(Date.parse(value.generated_at))) throw new Error("Invalid aggregate timestamp");
  function summary(report) {
    if (!record(report) || !record(report.diagnosis) || typeof report.target !== "string" || !Number.isFinite(Date.parse(report.timestamp_utc))) throw new Error("Invalid report summary");
  }
  function groups(items) {
    if (!Array.isArray(items) || items.length > 100000) throw new Error("Invalid group list");
    for (const item of items) {
      if (!record(item) || typeof item.key !== "string" || item.key.length > 253 || !count(item.total) || !count(item.ok) || !count(item.degraded)) throw new Error("Invalid group");
      if (item.unknown !== undefined && !count(item.unknown)) throw new Error("Invalid unknown counter");
      if (item.total !== item.ok + item.degraded + (item.unknown || 0)) throw new Error("Group counters do not reconcile");
      if (item.latest_reports !== undefined) {
        if (!Array.isArray(item.latest_reports)) throw new Error("Invalid latest reports");
        item.latest_reports.forEach(summary);
      }
      if (!Number.isFinite(item.degraded_ratio) || item.degraded_ratio < 0 || item.degraded_ratio > 1) throw new Error("Invalid ratio");
      if (item.last_seen && !Number.isFinite(Date.parse(item.last_seen))) throw new Error("Invalid group date");
      for (const key of ["providers", "regions", "days"]) if (item[key] !== undefined) groups(item[key]);
    }
  }
  for (const key of ["domains", "providers", "regions", "days", "categories"]) if (value[key] !== undefined) groups(value[key]);
  if (value.weather && Object.values(value.weather).some(n => !count(n))) throw new Error("Invalid weather counters");
  value.latest_reports.forEach(summary);
  return value;
}

export async function loadFirstJson(paths, fetcher = fetch) {
  for (const path of paths) {
    try {
      const response = await fetcher(path, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!response.ok) continue;
      // Await inside try: a rejected JSON promise must not bypass fallback handling.
      return assertAggregate(await response.json());
    } catch { /* Next known deployment layout; never replace broken real data with demo. */ }
  }
  return null;
}
