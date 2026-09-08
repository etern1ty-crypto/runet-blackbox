import test from "node:test";
import assert from "node:assert/strict";
import { loadFirstJson, assertAggregate } from "../apps/web/data.js";
import { aggregateReports } from "../src/aggregate.js";
import { buildReport } from "../src/report.js";

const empty = () => aggregateReports([]);
const valid = () => aggregateReports([buildReport({ target: "example.com", results: { dns: { status: "ok" }, tcp_443: { status: "ok" }, tls: { status: "ok" }, http: { status: "ok" } } })]);

test("dashboard awaits JSON parsing before trying the next layout", async () => {
  const calls = [];
  const result = await loadFirstJson(["bad.json", "good.json"], async url => {
    calls.push(url);
    return { ok: true, json: async () => { if (url === "bad.json") throw new SyntaxError("malformed"); return empty(); } };
  });
  assert.equal(result.total_reports, 0);
  assert.deepEqual(calls, ["bad.json", "good.json"]);
});

test("broken real dataset is not silently replaced by demo", async () => {
  const calls = [];
  const result = await loadFirstJson(["data/aggregates/index.json"], async url => { calls.push(url); throw new Error("offline"); });
  assert.equal(result, null);
  assert.deepEqual(calls, ["data/aggregates/index.json"]);
});

test("valid current and empty aggregate contracts display", () => {
  assert.equal(assertAggregate(valid()).total_reports, 1);
  assert.equal(assertAggregate(empty()).total_reports, 0);
});

for (const corrupt of [a => { a.total_reports = '<img src=x onerror=alert(1)>'; }, a => { a.domains[0].total = '<script>'; }, a => { a.domains[0].degraded_ratio = '0);alert(1)'; }, a => { a.domains[0].unknown = 100; }, a => { a.weather.mostly_ok = '<script>'; }, a => { a.latest_reports[0].timestamp_utc = 'broken'; }, a => { a.domains[0].latest_reports[0].diagnosis = null; }]) {
  test(`dashboard rejects untrusted numeric/date shape: ${corrupt.toString()}`, () => { const data = valid(); corrupt(data); assert.throws(() => assertAggregate(data)); });
}
