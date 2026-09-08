import { TOOL_VERSION } from "../../src/constants.js";
import { buildReport } from "../../src/report.js";
import { parseCliArgs } from "./args.js";
import { buildReportBundle } from "./bundle.js";
import { runCheck } from "./checks/run.js";
import { detectEnvironment } from "./environment.js";
import { formatBatchReport, formatDoctorReport, formatHumanReport, formatPacksList, helpText } from "./format.js";
import { availablePacks } from "./packs.js";
import { buildIssueBody, buildIssueUrl, clipboardCommandLabels, copyIssueBody, ISSUE_URL_LENGTH_LIMIT, issueUrlFits } from "./submit.js";
import { resolveCheckPlan } from "./config.js";
import { runBatch } from "./batch.js";
import { buildJUnit, buildPrometheus } from "./exports.js";
import { atomicWriteFile } from "./output.js";

export async function runCli(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  const writeFile = io.writeFile || atomicWriteFile;
  const copyText = io.copyText || copyIssueBody;
  const runNetworkCheck = io.runCheck || runCheck;
  const readEnvironment = io.detectEnvironment || detectEnvironment;
  try {
    const args = parseCliArgs(argv);
    if (args.command === "help") { stdout.write(helpText()); return 0; }
    if (args.command === "version") { stdout.write(`${TOOL_VERSION}\n`); return 0; }
    if (args.command === "sample") { stdout.write(JSON.stringify(sampleReport(), null, args.pretty ? 2 : 0) + "\n"); return 0; }
    if (args.command === "packs") { stdout.write(formatPacksList(availablePacks())); return 0; }
    if (args.command === "doctor") {
      stdout.write(formatDoctorReport(readEnvironment(), { nodeVersion: process.versions.node, platform: process.platform, clipboardCommands: clipboardCommandLabels(process.platform) }));
      return Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 64;
    }
    const plan = await resolveCheckPlan(args);
    const options = { ...plan.options, environment: readEnvironment(), signal: io.signal };
    if (options.environment.warning_ru) stderr.write(`runet-blackbox: ${options.environment.warning_ru}\n`);
    const log = record => { if (options.verbose) stderr.write(JSON.stringify({ level: "info", ...record }) + "\n"); };
    const reports = await runBatch(plan.targets, options, runNetworkCheck, log);
    const bundleMode = args.command === "preflight" || !args.target;
    const payload = bundleMode ? buildReportBundle({ pack: plan.pack, reports, environment: options.environment }) : reports[0];
    // Complete all probes before publishing any snapshot; cancellation never emits partial JSON.
    if (args.output) await writeFile(args.output, JSON.stringify(payload, null, 2) + "\n", "utf8");
    if (args.junit) await writeFile(args.junit, buildJUnit(payload), "utf8");
    if (args.prometheus) await writeFile(args.prometheus, buildPrometheus(payload), "utf8");
    let copied = false;
    if (args.issueFile || args.copyIssue) {
      const body = buildIssueBody(payload);
      if (args.issueFile) await writeFile(args.issueFile, body, "utf8");
      if (args.copyIssue) {
        copied = await copyText(body, process.platform, { signal: io.signal });
        stderr.write(copied ? "runet-blackbox: issue body copied to clipboard\n" : "runet-blackbox: clipboard unavailable; use --issue-file instead\n");
      }
    }
    let issueUrl = null;
    if (args.issueUrl) {
      const url = buildIssueUrl(payload);
      if (issueUrlFits(url)) issueUrl = url;
      else stderr.write(`runet-blackbox: issue URL exceeds ${ISSUE_URL_LENGTH_LIMIT} bytes; use --issue-file\n`);
      if (args.json && issueUrl) stderr.write(`runet-blackbox: GitHub issue URL: ${issueUrl}\n`);
    }
    const outputOptions = { output: args.output, issueFile: args.issueFile, copiedIssue: copied, issueUrl };
    stdout.write(args.json ? JSON.stringify(payload, null, args.pretty ? 2 : 0) + "\n" : bundleMode ? formatBatchReport(payload, outputOptions) : formatHumanReport(payload, outputOptions));
    return options.failOnDegraded && reports.some(report => report.diagnosis.category !== "ok") ? 2 : 0;
  } catch (error) {
    if (error?.code === "ABORT_ERR") { stderr.write("runet-blackbox: cancelled; no partial measurement snapshot written\n"); return 130; }
    const message = error.exitCode === 64 ? error.message : `operation failed (${error.code || "ERR_INTERNAL"}); no private OS details are logged`;
    stderr.write(`runet-blackbox: ${message}\n`);
    if (error.exitCode === 64) stderr.write("Run `runet-blackbox help` for usage.\n");
    return error.exitCode || 70;
  }
}

function sampleReport() {
  return buildReport({ target: "example.com", country: "ZZ", region: "Example region", provider: "Example network", asn: 64496, connectionType: "hosting", timestamp: new Date("2026-04-27T12:00:00.000Z"), results: {
    dns: { status: "ok", latency_ms: 12, addresses_count: 1, resolver: "system" },
    tcp_80: { status: "ok", latency_ms: 31, port: 80 }, tcp_443: { status: "ok", latency_ms: 34, port: 443 },
    tls: { status: "ok", latency_ms: 62, protocol: "TLSv1.3", alpn: "http/1.1", authorized: true },
    http: { status: "ok", latency_ms: 120, status_code: 200, content_length: 1256, body_truncated: false }
  } });
}
