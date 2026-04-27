import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { validateReport } from "../src/report-schema.js";

const valid = JSON.parse(await fs.readFile(new URL("./fixtures/valid-report.json", import.meta.url), "utf8"));

test("validateReport accepts fixture", () => {
  assert.equal(validateReport(valid).valid, true);
});

const invalidCases = [
  ["null report", null, "report must be an object"],
  ["array report", [], "report must be an object"],
  ["missing schema", { schema_version: undefined }, "schema_version is required"],
  ["wrong schema", { schema_version: "2.0" }, "schema_version must be 1.0"],
  ["missing tool version", { tool_version: "" }, "tool_version is required"],
  ["bad timestamp", { timestamp_utc: "not-a-date" }, "timestamp_utc must be an ISO timestamp"],
  ["bad target", { target: "localhost" }, "target must be a valid domain or IP address"],
  ["bad country", { country: "RUS" }, "country must be an ISO-3166 alpha-2 code"],
  ["missing network", { network: null }, "network must be an object"],
  ["bad network asn type", { network: { asn: "AS1", provider: "x", connection_type: "home" } }, "network.asn must be an integer or null"],
  ["network asn low", { network: { asn: 0, provider: "x", connection_type: "home" } }, "network.asn is out of range"],
  ["network asn high", { network: { asn: 4294967296, provider: "x", connection_type: "home" } }, "network.asn is out of range"],
  ["missing provider", { network: { asn: null, provider: "", connection_type: "home" } }, "network.provider is required"],
  ["bad connection type", { network: { asn: null, provider: "x", connection_type: "vpn" } }, "network.connection_type is invalid"],
  ["missing results", { results: null }, "results must be an object"],
  ["missing dns", { results: { dns: undefined } }, "results.dns is required"],
  ["unknown check", { results: { dns: { status: "ok" }, smtp: { status: "ok" } } }, "results.smtp is not a supported check"],
  ["bad result object", { results: { dns: "ok" } }, "results.dns must be an object"],
  ["bad result status", { results: { dns: { status: "weird" } } }, "results.dns.status is invalid"],
  ["bad latency", { results: { dns: { status: "ok", latency_ms: -1 } } }, "results.dns.latency_ms must be a non-negative number"],
  ["missing diagnosis", { diagnosis: null }, "diagnosis must be an object"],
  ["bad diagnosis category", { diagnosis: { category: "magic", confidence: 1, signals: [] } }, "diagnosis.category is invalid"],
  ["bad diagnosis confidence", { diagnosis: { category: "ok", confidence: 2, signals: [] } }, "diagnosis.confidence must be between 0 and 1"],
  ["bad diagnosis signals", { diagnosis: { category: "ok", confidence: 1, signals: "ok" } }, "diagnosis.signals must be an array"]
];

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
