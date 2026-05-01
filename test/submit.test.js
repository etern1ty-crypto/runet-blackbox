import test from "node:test";
import assert from "node:assert/strict";
import { buildIssueUrl, clipboardCommandLabels, issueUrlFits } from "../cli/internal/submit.js";

test("buildIssueUrl targets measurement issue form", () => {
  const url = new URL(buildIssueUrl(fakeReport()));
  assert.equal(url.hostname, "github.com");
  assert.equal(url.pathname, "/etern1ty-crypto/runet-blackbox/issues/new");
  assert.equal(url.searchParams.get("template"), "measurement-report.yml");
  assert.equal(url.searchParams.get("labels"), "measurement");
  assert.match(url.searchParams.get("title"), /github\.com/);
  assert.match(url.searchParams.get("report_json"), /"target": "github.com"/);
});

test("issueUrlFits rejects oversized browser URLs", () => {
  assert.equal(issueUrlFits("https://example.com/ok", 100), true);
  assert.equal(issueUrlFits(`https://example.com/${"a".repeat(120)}`, 100), false);
});

test("clipboardCommandLabels exposes platform providers", () => {
  assert.deepEqual(clipboardCommandLabels("win32"), ["clip.exe"]);
  assert.deepEqual(clipboardCommandLabels("darwin"), ["pbcopy"]);
  assert.deepEqual(clipboardCommandLabels("linux"), ["wl-copy", "xclip -selection clipboard", "xsel --clipboard --input"]);
});

function fakeReport() {
  return {
    schema_version: "1.0",
    tool_version: "0.3.0",
    timestamp_utc: "2026-04-27T12:00:00.000Z",
    target: "github.com",
    country: "RU",
    region: "Moscow",
    network: { asn: 12389, provider: "Rostelecom", connection_type: "home" },
    environment: { suspected_vpn_or_tunnel: false },
    results: {
      dns: { status: "ok", addresses_count: 1 },
      tcp_80: { status: "ok" },
      tcp_443: { status: "ok" },
      tls: { status: "ok" },
      http: { status: "skipped" }
    },
    diagnosis: { category: "ok", confidence: 0.72, signals: ["test"] },
    report_id: "rbb_0123456789abcdef0123"
  };
}
