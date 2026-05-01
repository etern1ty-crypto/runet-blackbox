import fs from "node:fs/promises";
import { TOOL_VERSION } from "../../src/constants.js";
import { buildReport } from "../../src/report.js";
import { parseCliArgs } from "./args.js";
import { buildReportBundle } from "./bundle.js";
import { runCheck } from "./checks/run.js";
import { detectEnvironment } from "./environment.js";
import { formatBatchReport, formatDoctorReport, formatHumanReport, formatPacksList, helpText } from "./format.js";
import { availablePacks, loadPack } from "./packs.js";
import { buildIssueBody, buildIssueUrl, clipboardCommandLabels, copyIssueBody, ISSUE_URL_LENGTH_LIMIT, issueUrlFits } from "./submit.js";

export async function runCli(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  const writeFile = io.writeFile || fs.writeFile;
  const copyText = io.copyText || copyIssueBody;
  const runNetworkCheck = io.runCheck || runCheck;
  const readEnvironment = io.detectEnvironment || detectEnvironment;

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
    if (args.command === "packs") {
      stdout.write(formatPacksList(availablePacks()));
      return 0;
    }
    if (args.command === "doctor") {
      stdout.write(formatDoctorReport(readEnvironment(), {
        nodeVersion: process.versions.node,
        platform: process.platform,
        clipboardCommands: clipboardCommandLabels(process.platform)
      }));
      return 0;
    }

    const environment = readEnvironment();
    if (environment.warning_ru) {
      stderr.write(`runet-blackbox: ${environment.warning_ru}\n`);
    }

    if (args.pack) {
      return await runPackCheck(args, { stdout, stderr, writeFile, copyText, runNetworkCheck, environment });
    }

    const report = await runNetworkCheck(args.target, { ...args, environment });
    const json = JSON.stringify(report, null, args.pretty ? 2 : 0);

    if (args.output) {
      await writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    }
    const issueUrl = prepareIssueUrl(report, args, stderr);
    if (args.issueFile || args.copyIssue) {
      const body = buildIssueBody(report);
      if (args.issueFile) {
        await writeFile(args.issueFile, body, "utf8");
      }
      if (args.copyIssue) {
        const copied = await copyText(body);
        stderr.write(copied ? "runet-blackbox: issue body copied to clipboard\n" : "runet-blackbox: clipboard unavailable; use --issue-file instead\n");
      }
    }

    if (args.json) {
      stdout.write(`${json}\n`);
    } else {
      stdout.write(formatHumanReport(report, { output: args.output, issueFile: args.issueFile, copiedIssue: args.copyIssue, issueUrl }));
    }

    return args.failOnDegraded && report.diagnosis.category !== "ok" ? 2 : 0;
  } catch (error) {
    stderr.write(`runet-blackbox: ${error.message}\n`);
    stderr.write("Run `runet-blackbox help` for usage.\n");
    return error.exitCode || 70;
  }
}

async function runPackCheck(args, io) {
  const pack = loadPack(args.pack);
  const reports = [];
  for (const target of pack.targets) {
    reports.push(await io.runNetworkCheck(target, { ...args, target, environment: io.environment }));
  }

  const bundle = buildReportBundle({ pack, reports, environment: io.environment });
  const json = JSON.stringify(bundle, null, args.pretty ? 2 : 0);

  if (args.output) {
    await io.writeFile(args.output, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  }
  const issueUrl = prepareIssueUrl(bundle, args, io.stderr);
  if (args.issueFile || args.copyIssue) {
    const body = buildIssueBody(bundle);
    if (args.issueFile) {
      await io.writeFile(args.issueFile, body, "utf8");
    }
    if (args.copyIssue) {
      const copied = await io.copyText(body);
      io.stderr.write(copied ? "runet-blackbox: issue body copied to clipboard\n" : "runet-blackbox: clipboard unavailable; use --issue-file instead\n");
    }
  }

  if (args.json) {
    io.stdout.write(`${json}\n`);
  } else {
    io.stdout.write(formatBatchReport(bundle, { output: args.output, issueFile: args.issueFile, copiedIssue: args.copyIssue, issueUrl }));
  }

  return args.failOnDegraded && reports.some((report) => report.diagnosis.category !== "ok") ? 2 : 0;
}

function prepareIssueUrl(payload, args, stderr) {
  if (!args.issueUrl) return null;
  const url = buildIssueUrl(payload);
  if (!issueUrlFits(url)) {
    stderr.write(`runet-blackbox: GitHub issue URL is too large for safe browser use (${Buffer.byteLength(url, "utf8")} bytes > ${ISSUE_URL_LENGTH_LIMIT}); use --issue-file or --copy-issue instead\n`);
    return null;
  }
  if (args.json) {
    stderr.write(`runet-blackbox: GitHub issue URL: ${url}\n`);
  }
  return url;
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
