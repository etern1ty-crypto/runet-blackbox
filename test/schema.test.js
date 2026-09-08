import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { validateReport } from "../src/report-schema.js";

const valid = JSON.parse(await fs.readFile(new URL("./fixtures/valid-report.json", import.meta.url), "utf8"));

test("validateReport accepts fixture", () => {
  assert.equal(validateReport(valid).valid, true);
});

const invalidCases = [
  ["null report", null, "report must be object"],
  ["array report", [], "report must be object"],
  ["missing schema", { schema_version: undefined }, "report.schema_version is required"],
  ["wrong schema", { schema_version: "2.0" }, "report.schema_version has an unsupported value"],
  ["missing tool version", { tool_version: "" }, "report.tool_version has an invalid format"],
  ["bad timestamp", { timestamp_utc: "not-a-date" }, "report.timestamp_utc must be an ISO timestamp"],
  ["bad target", { target: "localhost" }, "report.target is not a safe public target"],
  ["unsafe target", { target: "192.168.1.1" }, "report.target is not a safe public target"],
  ["bad report id", { report_id: "bad" }, "report.report_id has an invalid format"],
  ["bad country", { country: "RUS" }, "report.country has an invalid format"],
  ["missing network", { network: null }, "report.network must be object"],
  ["bad network asn type", { network: { asn: "AS1", provider: "x", connection_type: "home" } }, "report.network.asn must be integer or null"],
  ["network asn low", { network: { asn: 0, provider: "x", connection_type: "home" } }, "report.network.asn is below minimum"],
  ["network asn high", { network: { asn: 4294967296, provider: "x", connection_type: "home" } }, "report.network.asn exceeds maximum"],
  ["missing provider", { network: { asn: null, provider: "", connection_type: "home" } }, "report.network.provider is required"],
  ["bad connection type", { network: { asn: null, provider: "x", connection_type: "vpn" } }, "report.network.connection_type has an unsupported value"],
  ["bad environment", { environment: "vpn" }, "report.environment must be object"],
  ["bad environment VPN marker", { environment: { suspected_vpn_or_tunnel: "yes" } }, "report.environment.suspected_vpn_or_tunnel must be boolean"],
  ["missing results", { results: null }, "report.results must be object"],
  ["missing dns", { results: { dns: undefined } }, "report.results.dns is required"],
  ["unknown check", { results: { dns: { status: "ok" }, smtp: { status: "ok" } } }, "report.results contains an unsupported field"],
  ["bad result object", { results: { dns: "ok" } }, "report.results.dns must be object"],
  ["bad result status", { results: { dns: { status: "weird" } } }, "report.results.dns.status has an unsupported value"],
  ["bad latency", { results: { dns: { status: "ok", latency_ms: -1 } } }, "report.results.dns.latency_ms is below minimum"],
  ["missing diagnosis", { diagnosis: null }, "report.diagnosis must be object"],
  ["bad diagnosis category", { diagnosis: { category: "magic", confidence: 1, signals: [] } }, "report.diagnosis.category has an unsupported value"],
  ["bad diagnosis confidence", { diagnosis: { category: "ok", confidence: 2, signals: [] } }, "report.diagnosis.confidence exceeds maximum"],
  ["bad diagnosis signals", { diagnosis: { category: "ok", confidence: 1, signals: "ok" } }, "report.diagnosis.signals must be array"]
];

test("validateReport accepts dns_compare check", () => {
  const report = merge(structuredClone(valid), { results: { dns_compare: { status: "ok", latency_ms: 12 } } });
  assert.equal(validateReport(report).valid, true);
});

for (const [name, patch, expectedError] of invalidCases) {
  test(`validateReport rejects ${name}`, () => {
    const report = merge(structuredClone(valid), patch);
    const validation = validateReport(report);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.includes(expectedError), validation.errors.join("\n"));
  });
}

function merge(target, patch) {
  if (patch === null || Array.isArray(patch)) return patch;
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object") {
      merge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}
