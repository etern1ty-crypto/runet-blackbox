import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sanitizeReport } from "../src/privacy.js";
import { buildReport, prepareReport, reportId } from "../src/report.js";
import { validateReport } from "../src/report-schema.js";
import { aggregateReports } from "../src/aggregate.js";
import { withStoreLock } from "../scripts/lib/store.mjs";

const exec = promisify(execFile);
const clock = new Date("2026-06-10T12:00:00Z");
const healthy = (timestamp = clock) => buildReport({ target: "example.com", timestamp, results: { dns: { status: "ok" }, tcp_443: { status: "ok" }, tls: { status: "ok", authorized: true }, http: { status: "ok", status_code: 200 } } });
async function temp(t) { const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rbb-ingest-")); t.after(() => fs.rm(dir, { force: true, recursive: true })); return dir; }

test("allowlist drops arbitrary keys and nested secret carriers", () => {
  const raw = healthy(); raw.debug = { secret: "do-not-publish" }; raw.results.http.custom = { secret: "do-not-publish" }; raw.results.tls.certificate_subject = "do-not-publish"; raw.results.dns.resolver = "192.168.1.1";
  raw.results.http.error = "token=do-not-publish at 10.1.2.3";
  raw.results.http.headers = { authorization: "do-not-publish" };
  const clean = prepareReport(raw);
  assert.doesNotMatch(JSON.stringify(clean), /do-not-publish|10\.1\.2\.3|192\.168\.1\.1|certificate_subject|authorization/);
  assert.equal(clean.results.dns.resolver, "explicit");
});

test("prototype pollution keys never become object prototypes", () => {
  const raw = JSON.parse(JSON.stringify(healthy()).replace('"schema_version":', '"__proto__":{"polluted":true},"schema_version":'));
  const clean = prepareReport(raw);
  assert.equal(clean.polluted, undefined); assert.equal({}.polluted, undefined);
  assert.equal(Object.getPrototypeOf(clean), Object.prototype);
});

test("report identity and diagnosis are recalculated, not trusted", () => {
  const raw = healthy(); raw.results.dns.status = "timeout"; raw.report_id = "rbb_11111111111111111111";
  raw.diagnosis = { category: "ok", confidence: 1, signals: ["private attacker claim"] };
  const clean = prepareReport(raw);
  assert.equal(clean.diagnosis.category, "dns_timeout");
  assert.notEqual(clean.report_id, raw.report_id);
  assert.equal(clean.report_id, reportId(clean));
  assert.doesNotMatch(JSON.stringify(clean), /private attacker claim/);
  assert.deepEqual(prepareReport(clean), clean);
});

test("legacy 1.0 is upgraded and malformed placeholder hashes are removed", () => {
  const raw = healthy(); raw.schema_version = "1.0"; raw.results.http.body_sha256 = "sample";
  const clean = prepareReport(raw);
  assert.equal(clean.schema_version, "1.1"); assert.equal(clean.results.http.body_sha256, undefined);
});

for (const patch of [r => { r.results.http.status_code = "200"; }, r => { r.results.tls.authorized = "yes"; }, r => { r.results.dns.addresses_count = -1; }, r => { r.results.dns.latency_ms = Infinity; }, r => { r.results.dns_compare = { status: "ok", resolvers: [{ resolver: "comparison-1", status: "magic", addresses_count: 1 }] }; }, r => { r.results.tls.port = 25; }, r => { r.diagnosis.signals = [{ token: "secret" }]; }, r => { r.results.http.body_sha256 = "not-a-hash"; }]) {
  test(`strict schema rejects malformed typed field ${patch.toString()}`, () => { const raw = healthy(); patch(raw); assert.equal(validateReport(raw).valid, false); });
}

for (const timestamp of ["2026-02-30T10:00:00.000Z", "2026-06-10", "2026-06-10T12:00:00+03:00", "yesterday"]) {
  test(`invalid/noncanonical timestamp is not silently normalized: ${timestamp}`, () => { const raw = healthy(); raw.timestamp_utc = timestamp; assert.equal(validateReport(raw).valid, false); assert.throws(() => sanitizeReport(raw)); });
}

test("negative latency remains invalid instead of being clamped to success", () => { const raw = healthy(); raw.results.dns.latency_ms = -50; assert.throws(() => prepareReport(raw)); });

test("an OK HTTP label cannot hide a legacy HTTP 503", () => { const raw = healthy(); raw.results.http.status_code = 503; assert.equal(prepareReport(raw).diagnosis.category, "http_error"); });

test("an explicitly expected HTTP 401 retains its successful interpretation", () => { const raw = healthy(); raw.results.http.status_code = 401; raw.results.http.expected_status_codes = [401]; assert.equal(prepareReport(raw).diagnosis.category, "ok"); });

test("freshness, future timestamps, exact duplicates and VPN separation are explicit", () => {
  const tunnel = healthy(); tunnel.environment.suspected_vpn_or_tunnel = true;
  const result = aggregateReports([healthy(), healthy(), healthy("2026-06-08T00:00:00Z"), healthy("2026-06-11T00:00:00Z"), tunnel, { wrong: true }], { now: clock });
  assert.equal(result.total_reports, 1);
  assert.deepEqual(result.excluded, { invalid: 1, duplicate: 1, outside_window: 1, future: 1, tunnel: 1 });
  assert.equal(result.window_hours, 24);
});

test("unknown measurements never become incident candidates", () => {
  const samples = [0, 1, 2].map(index => {
    const raw = healthy(new Date(clock.getTime() - index * 15 * 60000)); raw.results = { dns: { status: "ok" } }; return raw;
  });
  const aggregate = aggregateReports(samples, { now: clock });
  assert.equal(aggregate.status, "unknown"); assert.equal(aggregate.domains[0].unknown, 3);
  assert.equal(aggregate.domains[0].degraded, 0); assert.equal(aggregate.incident_candidates.length, 0);
});

test("two degraded reports plus one healthy report do not meet a three-failure threshold", () => {
  const samples = [0, 1, 2].map(index => { const raw = healthy(new Date(clock.getTime() - index * 15 * 60000)); if (index < 2) raw.results.dns.status = "timeout"; return raw; });
  const aggregate = aggregateReports(samples, { now: clock });
  assert.equal(aggregate.incident_candidates.length, 0);
  assert.equal(aggregate.domains[0].weather.status, "degraded_candidate");
});

test("aggregation is deterministic with an injected clock", () => {
  const input = [healthy(), healthy("2026-06-10T11:00:00Z")];
  assert.deepEqual(aggregateReports(input, { now: clock }), aggregateReports([...input].reverse(), { now: clock }));
});

test("concurrent issue imports store exactly one canonical copy", async t => {
  const dir = await temp(t); const input = path.join(dir, "input.json"); const out = path.join(dir, "reports");
  await fs.writeFile(input, JSON.stringify(healthy()));
  const args = ["scripts/import-issue.mjs", "--body-file", input, "--out", out];
  await Promise.all([exec(process.execPath, args), exec(process.execPath, args), exec(process.execPath, args)]);
  const lines = (await fs.readFile(path.join(out, "2026-06-10.jsonl"), "utf8")).trim().split("\n");
  assert.equal(lines.length, 1); const stored = JSON.parse(lines[0]); assert.equal(stored.report_id, reportId(stored));
  assert.equal((await fs.readdir(out)).includes(".import.lock"), false);
});

test("forged IDs cannot suppress different targets or manufacture duplicates", async t => {
  const dir = await temp(t); const input = path.join(dir, "input.json"); const out = path.join(dir, "reports");
  const a = healthy(); const b = healthy(); b.target = "github.com";
  a.report_id = b.report_id = "rbb_11111111111111111111";
  const duplicate = { ...a, report_id: "rbb_22222222222222222222" };
  await fs.writeFile(input, JSON.stringify({ reports: [a, b, duplicate] }));
  await exec(process.execPath, ["scripts/import-issue.mjs", "--body-file", input, "--out", out]);
  const lines = (await fs.readFile(path.join(out, "2026-06-10.jsonl"), "utf8")).trim().split("\n");
  assert.equal(lines.length, 2);
});

test("malformed hostile issue text is never reflected in a public summary", async t => {
  const dir = await temp(t); const input = path.join(dir, "bad.json"); const summary = path.join(dir, "summary.md");
  await fs.writeFile(input, '{"secret":"private-token",BROKEN}');
  await assert.rejects(exec(process.execPath, ["scripts/import-issue.mjs", "--body-file", input, "--out", path.join(dir, "reports"), "--summary-file", summary]));
  assert.doesNotMatch(await fs.readFile(summary, "utf8"), /private-token|BROKEN/);
});

test("existing corrupt daily shards are not overwritten", async t => {
  const dir = await temp(t); const input = path.join(dir, "input.json"); const out = path.join(dir, "reports"); await fs.mkdir(out);
  const shard = path.join(out, "2026-06-10.jsonl"); await fs.writeFile(shard, "bad-json\n"); await fs.writeFile(input, JSON.stringify(healthy()));
  await assert.rejects(exec(process.execPath, ["scripts/import-issue.mjs", "--body-file", input, "--out", out]));
  assert.equal(await fs.readFile(shard, "utf8"), "bad-json\n");
});

test("stale store lock fails within a bound and is not stolen", async t => {
  const dir = await temp(t); await fs.mkdir(path.join(dir, ".import.lock"));
  await assert.rejects(withStoreLock(dir, () => {}, 50), { code: "ERR_STORE_LOCKED" });
  assert.ok((await fs.stat(path.join(dir, ".import.lock"))).isDirectory());
});

test("aggregate script reads CLI bundles and removes stale generated domain artifacts", async t => {
  const dir = await temp(t); const input = path.join(dir, "reports"); const out = path.join(dir, "aggregates"); await fs.mkdir(input); await fs.mkdir(path.join(out, "domains"), { recursive: true });
  await fs.writeFile(path.join(out, "domains/obsolete.json"), "{}");
  await fs.writeFile(path.join(input, "bundle.json"), JSON.stringify({ reports: [healthy(new Date())] }));
  await exec(process.execPath, ["scripts/aggregate.mjs", input, out]);
  const aggregate = JSON.parse(await fs.readFile(path.join(out, "index.json"), "utf8"));
  assert.equal(aggregate.total_reports, 1);
  await assert.rejects(fs.stat(path.join(out, "domains/obsolete.json")), { code: "ENOENT" });
});
