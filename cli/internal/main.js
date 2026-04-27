import fs from "node:fs/promises";
import { TOOL_VERSION } from "../../src/constants.js";
import { buildReport } from "../../src/report.js";
import { parseCliArgs } from "./args.js";
import { runCheck } from "./checks/run.js";
import { formatHumanReport, helpText } from "./format.js";

export async function runCli(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  const writeFile = io.writeFile || fs.writeFile;

  try {
    const args = parseCliArgs(argv);

    if (args.command === "help") {
      stdout.write(helpText());
      return 0;
    }
    if (args.command === "version") {
      stdout.write(`${TOOL_VERSION}\n`);
      return 0;
    }
    if (args.command === "sample") {
      const sample = sampleReport();
      stdout.write(`${JSON.stringify(sample, null, args.pretty ? 2 : 0)}\n`);
      return 0;
    }

    const report = await runCheck(args.target, args);
    const json = JSON.stringify(report, null, args.pretty ? 2 : 0);

    if (args.output) {
      await writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    }

    if (args.json) {
      stdout.write(`${json}\n`);
    } else {
      stdout.write(formatHumanReport(report, { output: args.output }));
    }

    return args.failOnDegraded && report.diagnosis.category !== "ok" ? 2 : 0;
  } catch (error) {
    stderr.write(`runet-blackbox: ${error.message}\n`);
    stderr.write("Run `runet-blackbox help` for usage.\n");
    return error.exitCode || 70;
  }
}

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
