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

test("parseCliArgs returns packs", () => {
  assert.deepEqual(parseCliArgs(["packs"]), { command: "packs" });
});

test("parseCliArgs returns doctor", () => {
  assert.deepEqual(parseCliArgs(["doctor"]), { command: "doctor" });
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

test("parseCheckArgs parses dns alias", () => {
  assert.equal(parseCheckArgs(["github.com", "--dns", "8.8.8.8"]).dnsServer, "8.8.8.8");
});

test("parseCheckArgs parses ipv6 dns resolver", () => {
  assert.equal(parseCheckArgs(["github.com", "--dns", "2001:4860:4860::8888"]).dnsServer, "2001:4860:4860::8888");
});

test("parseCheckArgs parses dns comparison resolvers", () => {
  assert.deepEqual(parseCheckArgs(["github.com", "--compare-dns", "8.8.8.8", "--dns-compare", "1.1.1.1"]).dnsCompareServers, [
    "8.8.8.8",
    "1.1.1.1"
  ]);
});

test("parseCheckArgs deduplicates and caps dns comparison resolvers", () => {
  assert.deepEqual(
    parseCheckArgs(["github.com", "--compare-dns", "8.8.8.8", "--compare-dns", "8.8.8.8", "--compare-dns", "1.1.1.1", "--compare-dns", "9.9.9.9", "--compare-dns", "76.76.2.0"]).dnsCompareServers,
    ["8.8.8.8", "1.1.1.1", "9.9.9.9"]
  );
});

test("parseCheckArgs parses output short option", () => {
  assert.equal(parseCheckArgs(["github.com", "-o", "report.json"]).output, "report.json");
});

test("parseCheckArgs parses issue file", () => {
  assert.equal(parseCheckArgs(["github.com", "--issue-file", "report.issue.md"]).issueFile, "report.issue.md");
});

test("parseCheckArgs parses copy issue", () => {
  assert.equal(parseCheckArgs(["github.com", "--copy-issue"]).copyIssue, true);
});

test("parseCheckArgs parses issue url", () => {
  assert.equal(parseCheckArgs(["github.com", "--issue-url"]).issueUrl, true);
});

test("parseCheckArgs parses pack", () => {
  const options = parseCheckArgs(["--pack", "DEV"]);
  assert.equal(options.pack, "dev");
  assert.equal(options.target, null);
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

test("parseCheckArgs rejects target with pack", () => {
  assert.throws(() => parseCheckArgs(["github.com", "--pack", "dev"]));
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

test("parseCheckArgs rejects invalid dns resolver", () => {
  assert.throws(() => parseCheckArgs(["github.com", "--compare-dns", "resolver.example"]));
});

test("parseCliArgs usage errors expose exit code 64", () => {
  assert.throws(
    () => parseCliArgs(["bad"]),
    (error) => error.exitCode === 64
  );
});
