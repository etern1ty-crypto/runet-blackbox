import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { runCli } from "../cli/internal/main.js";

const execFileAsync = promisify(execFile);
const bin = fileURLToPath(new URL("../cli/bin/runet-blackbox.js", import.meta.url));
const canRunSubprocessCli = await canCaptureNodeStdout();

test("CLI version prints version", async () => {
  const result = await runCliCapture(["version"]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /^0\.1\.0\n$/);
});

test("CLI help includes examples and exit codes", async () => {
  const result = await runCliCapture(["help"]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Examples:/);
  assert.match(result.stdout, /Exit codes:/);
  assert.match(result.stdout, /--dns, --dns-server/);
});

test("CLI sample prints valid JSON with report id", async () => {
  const result = await runCliCapture(["sample"]);
  assert.equal(result.exitCode, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.target, "example.com");
  assert.match(report.report_id, /^rbb_[a-f0-9]{20}$/);
});

test("CLI unknown command exits with usage code", async () => {
  const result = await runCliCapture(["nope"]);
  assert.equal(result.exitCode, 64);
  assert.match(result.stderr, /unknown command/);
});

test("CLI rejects unsafe local targets before probing", async () => {
  const result = await runCliCapture(["check", "localhost", "--no-http"]);
  assert.equal(result.exitCode, 64);
  assert.match(result.stderr, /unsafe measurement target/);
});

test("CLI writes ready-to-submit issue body", async () => {
  let filePath = null;
  let fileBody = null;
  const result = await runCliCapture(
    ["sample"],
    {
      writeFile: async (path, body) => {
        filePath = path;
        fileBody = body;
      }
    }
  );
  assert.equal(result.exitCode, 0);
  assert.equal(filePath, null);

  const issueResult = await runCliCapture(
    ["check", "github.com", "--no-http", "--issue-file", "report.issue.md"],
    {
      runCheck: async () => fakeReport(),
      writeFile: async (path, body) => {
        filePath = path;
        fileBody = body;
      }
    }
  );
  assert.equal(issueResult.exitCode, 0);
  assert.equal(filePath, "report.issue.md");
  assert.match(fileBody, /## Report JSON/);
  assert.match(fileBody, /"target": "github.com"/);
  assert.match(fileBody, /не запрос инструкций/);
});

test("CLI copies issue body when clipboard adapter is available", async () => {
  let copied = "";
  const result = await runCliCapture(
    ["check", "github.com", "--no-http", "--copy-issue"],
    {
      runCheck: async () => fakeReport(),
      copyText: async (body) => {
        copied = body;
        return true;
      }
    }
  );
  assert.equal(result.exitCode, 0);
  assert.match(result.stderr, /copied to clipboard/);
  assert.match(copied, /"target": "github.com"/);
});

test("CLI binary runs as a subprocess", { skip: canRunSubprocessCli ? false : "sandbox blocks child process stdout" }, async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "version"]);
  assert.match(stdout, /^0\.1\.0\n$/);
});

async function runCliCapture(argv, overrides = {}) {
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(argv, {
    stdout: { write: (chunk) => { stdout += chunk; } },
    stderr: { write: (chunk) => { stderr += chunk; } },
    ...overrides
  });
  return { exitCode, stdout, stderr };
}

async function canCaptureNodeStdout() {
  try {
    const { stdout } = await execFileAsync(process.execPath, ["-e", "console.log('ok')"]);
    return stdout === "ok\n";
  } catch {
    return false;
  }
}

function fakeReport() {
  return {
    schema_version: "1.0",
    tool_version: "0.1.0",
    timestamp_utc: "2026-04-27T12:00:00.000Z",
    target: "github.com",
    country: "RU",
    region: "Moscow",
    network: { asn: 12389, provider: "Rostelecom", connection_type: "home" },
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
