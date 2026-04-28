import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { aggregateReports, domainAggregate } from "../src/aggregate.js";

const fixture = JSON.parse(await fs.readFile(new URL("./fixtures/valid-report.json", import.meta.url), "utf8"));

function makeReport({ target = "github.com", category = "ok", region = "Moscow", provider = "Rostelecom", asn = 12389, ts = "2026-04-27T12:00:00.000Z" } = {}) {
  return {
    ...structuredClone(fixture),
    timestamp_utc: ts,
    target,
    region,
    network: {
      asn,
      provider,
      connection_type: "home"
    },
    diagnosis: {
      category,
      confidence: category === "ok" ? 0.94 : 0.8,
      signals: [category]
    }
  };
}

test("aggregateReports counts total reports", () => {
  assert.equal(aggregateReports([makeReport(), makeReport()]).total_reports, 2);
});

test("aggregateReports counts unique targets", () => {
  assert.equal(aggregateReports([makeReport(), makeReport({ target: "ya.ru" })]).total_targets, 2);
});

test("aggregateReports exposes overall status", () => {
  assert.equal(aggregateReports([makeReport({ category: "tls_timeout" })]).status, "degraded");
});

test("aggregateReports exposes dataset quality", () => {
  const aggregate = aggregateReports([makeReport()]);
  assert.equal(aggregate.dataset_quality.level, "early");
});

test("aggregateReports counts degraded targets", () => {
  assert.equal(aggregateReports([makeReport({ category: "tls_timeout" })]).degraded_targets, 1);
});

test("aggregateReports marks degraded domains", () => {
  const aggregate = aggregateReports([makeReport({ category: "dns_timeout" }), makeReport({ category: "ok" }), makeReport({ category: "tls_timeout" })]);
  assert.equal(aggregate.domains[0].status, "degraded");
});

test("aggregateReports groups providers with ASN", () => {
  const aggregate = aggregateReports([makeReport({ provider: "MTS", asn: 8359 })]);
  assert.equal(aggregate.providers[0].key, "MTS (AS8359)");
});

test("aggregateReports groups regions", () => {
  const aggregate = aggregateReports([makeReport({ region: "Kazan" })]);
  assert.equal(aggregate.regions[0].key, "Kazan");
});

test("aggregateReports groups days", () => {
  const aggregate = aggregateReports([makeReport({ ts: "2026-04-28T01:00:00.000Z" })]);
  assert.equal(aggregate.days[0].key, "2026-04-28");
});

test("aggregateReports groups categories", () => {
  const aggregate = aggregateReports([makeReport({ category: "http_blockpage_suspected" })]);
  assert.equal(aggregate.categories[0].key, "http_blockpage_suspected");
});

test("aggregateReports latest reports sorted descending", () => {
  const aggregate = aggregateReports([
    makeReport({ ts: "2026-04-27T12:00:00.000Z" }),
    makeReport({ target: "ya.ru", ts: "2026-04-27T13:00:00.000Z" })
  ]);
  assert.equal(aggregate.latest_reports[0].target, "ya.ru");
});

test("aggregateReports latest reports include diagnosis metadata", () => {
  const aggregate = aggregateReports([makeReport({ category: "tls_timeout" })]);
  assert.equal(aggregate.latest_reports[0].diagnosis.title, "TLS timeout");
  assert.equal(aggregate.latest_reports[0].diagnosis.title_ru, "Таймаут TLS");
  assert.equal(aggregate.latest_reports[0].diagnosis.severity, "degraded");
});

test("aggregateReports drops invalid reports", () => {
  const aggregate = aggregateReports([makeReport(), { nope: true }]);
  assert.equal(aggregate.total_reports, 1);
});

test("domainAggregate filters by target", () => {
  const aggregate = domainAggregate([makeReport(), makeReport({ target: "ya.ru" })], "github.com");
  assert.equal(aggregate.total_reports, 1);
  assert.equal(aggregate.target, "github.com");
});

test("aggregateReports computes degraded ratio", () => {
  const aggregate = aggregateReports([makeReport({ category: "ok" }), makeReport({ category: "tls_timeout" })]);
  assert.equal(aggregate.domains[0].degraded_ratio, 0.5);
});

test("aggregateReports marks low sample credibility", () => {
  const aggregate = aggregateReports([makeReport()]);
  assert.equal(aggregate.domains[0].credibility.level, "single_report");
  assert.equal(aggregate.latest_reports[0].credibility.level, "single_report");
});
