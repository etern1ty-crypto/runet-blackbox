import test from "node:test";
import assert from "node:assert/strict";
import { buildReport } from "../src/report.js";
import { validateReport } from "../src/report-schema.js";

test("buildReport creates a valid sanitized report", () => {
  const report = buildReport({
    target: "GitHub.com",
    country: "ru",
    region: "Moscow",
    provider: "Rostelecom",
    asn: "AS12389",
    connectionType: "home",
    environment: { suspected_vpn_or_tunnel: true, interface_name: "tun0" },
    timestamp: new Date("2026-04-27T12:08:00Z"),
    results: {
      dns: { status: "ok", latency_ms: 10, addresses_count: 2 },
      tcp_443: { status: "ok", latency_ms: 20 },
      tls: { status: "ok", latency_ms: 30 },
      http: { status: "ok", latency_ms: 40 }
    }
  });
  assert.equal(report.target, "github.com");
  assert.match(report.report_id, /^rbb_[a-f0-9]{20}$/);
  assert.equal(report.country, "RU");
  assert.equal(report.timestamp_utc, "2026-04-27T12:00:00.000Z");
  assert.equal(report.diagnosis.category, "ok");
  assert.deepEqual(report.environment, { suspected_vpn_or_tunnel: true });
  assert.equal(validateReport(report).valid, true);
});

test("buildReport classifies dns timeout", () => {
  const report = buildReport({
    target: "github.com",
    results: {
      dns: { status: "timeout" }
    }
  });
  assert.equal(report.diagnosis.category, "dns_timeout");
});

test("buildReport rejects invalid target", () => {
  assert.throws(() => buildReport({ target: "localhost", results: { dns: { status: "ok" } } }));
});

test("buildReport rejects private IP targets", () => {
  assert.throws(() => buildReport({ target: "192.168.1.1", results: { dns: { status: "ok" } } }));
});
