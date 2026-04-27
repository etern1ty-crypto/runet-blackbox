#!/usr/bin/env node
import fs from "node:fs/promises";
import { TOOL_VERSION } from "../../src/constants.js";
import { buildReport } from "../../src/report.js";
import { parseCliArgs } from "../internal/args.js";
import { formatHumanReport, helpText } from "../internal/format.js";
import { runCheck } from "../internal/checks/run.js";

async function main() {
  const args = parseCliArgs(process.argv.slice(2));

  if (args.command === "help") {
    process.stdout.write(helpText());
    return;
  }
  if (args.command === "version") {
    process.stdout.write(`${TOOL_VERSION}\n`);
    return;
  }
  if (args.command === "sample") {
    const sample = sampleReport();
    process.stdout.write(`${JSON.stringify(sample, null, args.pretty ? 2 : 0)}\n`);
    return;
  }

  const report = await runCheck(args.target, args);
  const json = JSON.stringify(report, null, args.pretty ? 2 : 0);

  if (args.output) {
    await fs.writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  if (args.json) {
    process.stdout.write(`${json}\n`);
  } else {
    process.stdout.write(formatHumanReport(report, { output: args.output }));
  }

  if (args.failOnDegraded && report.diagnosis.category !== "ok") {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  process.stderr.write(`runet-blackbox: ${error.message}\n`);
  process.stderr.write("Run `runet-blackbox help` for usage.\n");
  process.exitCode = error.exitCode || 70;
});

function sampleReport() {
  return buildReport({
    target: "example.com",
    country: "RU",
    region: "Moscow",
    provider: "ExampleNet",
    asn: "AS64496",
    connectionType: "home",
    timestamp: new Date("2026-04-27T12:00:00.000Z"),
    results: {
      dns: { status: "ok", latency_ms: 12, addresses_count: 2 },
      tcp_80: { status: "ok", latency_ms: 31, port: 80 },
      tcp_443: { status: "ok", latency_ms: 34, port: 443 },
      tls: { status: "ok", latency_ms: 62, protocol: "TLSv1.3", alpn: "h2" },
      http: { status: "ok", latency_ms: 120, status_code: 200, content_length: 1256, body_sha256: "sample", headers_hash: "sample" }
    }
  });
}
