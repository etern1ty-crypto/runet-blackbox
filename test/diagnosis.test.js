import test from "node:test";
import assert from "node:assert/strict";
import { classifyReport } from "../src/diagnosis.js";

function report(overrides) {
  return {
    results: {
      dns: { status: "ok" },
      tcp_80: { status: "ok" },
      tcp_443: { status: "ok" },
      tls: { status: "ok" },
      http: { status: "ok" },
      ...overrides
    }
  };
}

const cases = [
  ["all checks ok", {}, "ok"],
  ["dns timeout", { dns: { status: "timeout" } }, "dns_timeout"],
  ["dns nxdomain", { dns: { status: "nxdomain" } }, "dns_nxdomain"],
  ["dns suspicious", { dns: { status: "suspicious_answer" } }, "dns_suspicious_answer"],
  ["dns servfail", { dns: { status: "servfail" } }, "dns_failure"],
  ["dns refused", { dns: { status: "refused" } }, "dns_failure"],
  ["dns generic error", { dns: { status: "error" } }, "dns_failure"],
  ["both tcp ports timeout", { tcp_80: { status: "timeout" }, tcp_443: { status: "timeout" } }, "service_global_outage_possible"],
  ["tcp 443 timeout", { tcp_443: { status: "timeout" } }, "tcp_timeout"],
  ["tcp 443 reset", { tcp_443: { status: "reset" } }, "tcp_reset"],
  ["tcp 443 refused", { tcp_443: { status: "connection_refused" } }, "tcp_refused"],
  ["tls reset after client hello", { tls: { status: "reset_after_client_hello" } }, "possible_tls_dpi_or_middlebox_reset"],
  ["tls reset", { tls: { status: "reset" } }, "possible_tls_dpi_or_middlebox_reset"],
  ["tls timeout", { tls: { status: "timeout" } }, "tls_timeout"],
  ["tls certificate mismatch", { tls: { status: "certificate_mismatch" } }, "tls_certificate_mismatch"],
  ["tls certificate error", { tls: { status: "certificate_error" } }, "tls_certificate_mismatch"],
  ["http blockpage status", { http: { status: "blockpage_suspected" } }, "http_blockpage_suspected"],
  ["http blockpage boolean", { http: { status: "ok", blockpage_suspected: true } }, "http_blockpage_suspected"],
  ["http unexpected redirect", { http: { status: "unexpected_redirect" } }, "http_unexpected_redirect"],
  ["measurement error", { http: { status: "error" } }, "measurement_error"],
  ["http skipped after transport ok", { http: { status: "skipped" } }, "ok"],
  ["no decisive signal", { tcp_443: { status: "not_tested" }, tls: { status: "not_tested" }, http: { status: "not_tested" } }, "insufficient_data"]
];

for (const [name, overrides, expected] of cases) {
  test(`classifyReport: ${name}`, () => {
    assert.equal(classifyReport(report(overrides)).category, expected);
  });
}

test("classifyReport confidence is clamped to two decimals", () => {
  const diagnosis = classifyReport(report({ dns: { status: "timeout" } }));
  assert.equal(diagnosis.confidence, 0.9);
});

test("classifyReport returns signals", () => {
  const diagnosis = classifyReport(report({ tcp_443: { status: "timeout" } }));
  assert.ok(diagnosis.signals.length > 0);
});
