import test from "node:test";
import assert from "node:assert/strict";
import { findSensitivePaths, sanitizeReport, stripSensitive } from "../src/privacy.js";

const baseReport = {
  schema_version: "1.0",
  tool_version: "0.1.0",
  timestamp_utc: "2026-04-27T12:07:33.000Z",
  target: "GitHub.com",
  country: "ru",
  region: "  Moscow  ",
  network: {
    asn: "AS12389",
    provider: "  Rostelecom ",
    connection_type: "home"
  },
  results: {
    dns: {
      status: "ok",
      latency_ms: 10.6,
      addresses: ["1.1.1.1"],
      addresses_count: 1
    },
    http: {
      status: "ok",
      body: "private",
      headers: { "set-cookie": "secret" },
      body_sha256: "hash",
      latency_ms: 20.3
    }
  },
  diagnosis: {
    category: "ok",
    confidence: 1.234,
    signals: ["passed"]
  },
  client_ip: "192.0.2.10"
};

const sensitiveKeys = [
  "ip",
  "ips",
  "client_ip",
  "source_ip",
  "remote_ip",
  "remote_address",
  "local_address",
  "body",
  "body_preview",
  "raw_body",
  "headers",
  "raw_headers",
  "request_headers",
  "response_headers",
  "cookies",
  "cookie",
  "authorization",
  "x-forwarded-for",
  "cf-connecting-ip",
  "true-client-ip",
  "traceroute",
  "packet_capture"
];

for (const key of sensitiveKeys) {
  test(`stripSensitive removes ${key}`, () => {
    const result = stripSensitive({ keep: true, [key]: "secret", nested: { [key]: "secret" } });
    assert.equal(result[key], undefined);
    assert.equal(result.nested[key], undefined);
    assert.equal(result.keep, true);
  });
}

test("sanitizeReport normalizes target", () => {
  assert.equal(sanitizeReport(baseReport).target, "github.com");
});

test("sanitizeReport uppercases country", () => {
  assert.equal(sanitizeReport(baseReport).country, "RU");
});

test("sanitizeReport trims region", () => {
  assert.equal(sanitizeReport(baseReport).region, "Moscow");
});

test("sanitizeReport parses ASN", () => {
  assert.equal(sanitizeReport(baseReport).network.asn, 12389);
});

test("sanitizeReport trims provider", () => {
  assert.equal(sanitizeReport(baseReport).network.provider, "Rostelecom");
});

test("sanitizeReport rounds timestamp to 15 minutes", () => {
  assert.equal(sanitizeReport(baseReport).timestamp_utc, "2026-04-27T12:00:00.000Z");
});

test("sanitizeReport rounds latency", () => {
  assert.equal(sanitizeReport(baseReport).results.dns.latency_ms, 11);
});

test("sanitizeReport removes raw DNS answers", () => {
  assert.equal(sanitizeReport(baseReport).results.dns.addresses, undefined);
});

test("sanitizeReport preserves safe body hash", () => {
  assert.equal(sanitizeReport(baseReport).results.http.body_sha256, "hash");
});

test("sanitizeReport clamps confidence", () => {
  assert.equal(sanitizeReport(baseReport).diagnosis.confidence, 1);
});

test("sanitizeReport defaults invalid connection type", () => {
  const report = structuredClone(baseReport);
  report.network.connection_type = "satellite";
  assert.equal(sanitizeReport(report).network.connection_type, "unknown");
});

test("findSensitivePaths reports nested sensitive fields", () => {
  assert.deepEqual(findSensitivePaths({ a: { headers: { cookie: "x" } }, b: [{ client_ip: "1.2.3.4" }] }), ["a.headers", "b.0.client_ip"]);
});
