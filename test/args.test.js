import test from "node:test";
import assert from "node:assert/strict";
import { parseCheckArgs, parseCliArgs } from "../cli/internal/args.js";

test("parseCliArgs returns help without args", () => {
  assert.deepEqual(parseCliArgs([]), { command: "help" });
});

test("parseCliArgs returns version", () => {
  assert.deepEqual(parseCliArgs(["version"]), { command: "version" });
});

test("parseCliArgs returns sample", () => {
  assert.deepEqual(parseCliArgs(["sample", "--pretty"]), { command: "sample", pretty: true });
});

test("parseCliArgs rejects unknown command", () => {
  assert.throws(() => parseCliArgs(["scan"]));
});

test("parseCheckArgs parses target", () => {
  assert.equal(parseCheckArgs(["github.com"]).target, "github.com");
});

test("parseCheckArgs parses country", () => {
  assert.equal(parseCheckArgs(["github.com", "--country", "KZ"]).country, "KZ");
});

test("parseCheckArgs parses region", () => {
  assert.equal(parseCheckArgs(["github.com", "--region", "Moscow"]).region, "Moscow");
});

test("parseCheckArgs parses provider", () => {
  assert.equal(parseCheckArgs(["github.com", "--provider", "MTS"]).provider, "MTS");
});

test("parseCheckArgs parses ASN", () => {
  assert.equal(parseCheckArgs(["github.com", "--asn", "AS8359"]).asn, 8359);
});

test("parseCheckArgs parses connection type", () => {
  assert.equal(parseCheckArgs(["github.com", "--connection-type", "mobile"]).connectionType, "mobile");
});

test("parseCheckArgs parses timeout", () => {
  assert.equal(parseCheckArgs(["github.com", "--timeout", "1000"]).timeoutMs, 1000);
});

test("parseCheckArgs parses dns server", () => {
  assert.equal(parseCheckArgs(["github.com", "--dns-server", "1.1.1.1"]).dnsServer, "1.1.1.1");
});

test("parseCheckArgs parses output short option", () => {
  assert.equal(parseCheckArgs(["github.com", "-o", "report.json"]).output, "report.json");
});

test("parseCheckArgs parses json and pretty", () => {
  const options = parseCheckArgs(["github.com", "--json", "--pretty"]);
  assert.equal(options.json, true);
  assert.equal(options.pretty, true);
});

test("parseCheckArgs parses no-http", () => {
  assert.equal(parseCheckArgs(["github.com", "--no-http"]).http, false);
});

test("parseCheckArgs parses fail-on-degraded", () => {
  assert.equal(parseCheckArgs(["github.com", "--fail-on-degraded"]).failOnDegraded, true);
});

test("parseCheckArgs rejects missing target", () => {
  assert.throws(() => parseCheckArgs([]));
});

test("parseCheckArgs rejects extra target", () => {
  assert.throws(() => parseCheckArgs(["a.com", "b.com"]));
});

test("parseCheckArgs rejects unknown option", () => {
  assert.throws(() => parseCheckArgs(["github.com", "--bad"]));
});

test("parseCheckArgs rejects missing option value", () => {
  assert.throws(() => parseCheckArgs(["github.com", "--region"]));
});

test("parseCheckArgs rejects invalid timeout", () => {
  assert.throws(() => parseCheckArgs(["github.com", "--timeout", "10"]));
});

test("parseCliArgs usage errors expose exit code 64", () => {
  assert.throws(
    () => parseCliArgs(["bad"]),
    (error) => error.exitCode === 64
  );
});
