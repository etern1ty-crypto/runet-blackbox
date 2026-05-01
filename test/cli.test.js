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
  assert.match(result.stdout, /^0\.3\.0\n$/);
});

test("CLI help includes examples and exit codes", async () => {
  const result = await runCliCapture(["help"]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Examples:/);
  assert.match(result.stdout, /Exit codes:/);
  assert.match(result.stdout, /--dns, --dns-server/);
  assert.match(result.stdout, /--pack/);
  assert.match(result.stdout, /--issue-url/);
  assert.match(result.stdout, /doctor/);
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

test("CLI prints issue URL in human output", async () => {
  const result = await runCliCapture(
    ["check", "github.com", "--no-http", "--issue-url"],
    {
      runCheck: async () => fakeReport()
    }
  );
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /GitHub issue URL:/);
  assert.match(result.stdout, /issues\/new/);
  assert.match(result.stdout, /report_json=/);
});

test("CLI keeps JSON stdout stable when printing issue URL", async () => {
  const result = await runCliCapture(
    ["check", "github.com", "--no-http", "--json", "--issue-url"],
    {
      runCheck: async () => fakeReport()
    }
  );
  assert.equal(result.exitCode, 0);
  assert.equal(JSON.parse(result.stdout).target, "github.com");
  assert.match(result.stderr, /GitHub issue URL:/);
});

test("CLI doctor prints safe local diagnostics", async () => {
  const result = await runCliCapture(
    ["doctor"],
    {
      detectEnvironment: () => ({
        suspected_vpn_or_tunnel: true,
        warning_ru: "test warning"
      })
    }
  );
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Runet Blackbox doctor/);
  assert.match(result.stdout, /Node\.js:/);
  assert.match(result.stdout, /VPN\/tun\/proxy/);
  assert.doesNotMatch(result.stdout, /test warning/);
});

test("CLI lists target packs", async () => {
  const result = await runCliCapture(["packs"]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /dev/);
  assert.match(result.stdout, /baseline/);
});

test("CLI runs a pack and prints JSON bundle", async () => {
  const result = await runCliCapture(
    ["check", "--pack", "baseline", "--json"],
    {
      runCheck: async (target, options) => fakeReport({ target, environment: options.environment }),
      detectEnvironment: () => ({ suspected_vpn_or_tunnel: false })
    }
  );
  assert.equal(result.exitCode, 0);
  const bundle = JSON.parse(result.stdout);
  assert.equal(bundle.pack.name, "baseline");
  assert.equal(bundle.reports.length, 4);
  assert.equal(bundle.reports[0].environment.suspected_vpn_or_tunnel, false);
});

test("CLI marks pack reports when VPN-like environment is detected", async () => {
  const result = await runCliCapture(
    ["check", "--pack", "baseline", "--issue-file", "pack.issue.md"],
    {
      runCheck: async (target, options) => fakeReport({ target, environment: options.environment }),
      detectEnvironment: () => ({
        suspected_vpn_or_tunnel: true,
        warning_ru: "test vpn warning"
      }),
      writeFile: async () => {}
    }
  );
  assert.equal(result.exitCode, 0);
  assert.match(result.stderr, /test vpn warning/);
  assert.match(result.stdout, /VPN\/tun\/proxy/);
});

test("CLI writes pack issue body", async () => {
  let fileBody = "";
  const result = await runCliCapture(
    ["check", "--pack", "baseline", "--issue-file", "pack.issue.md"],
    {
      runCheck: async (target) => fakeReport({ target }),
      detectEnvironment: () => ({ suspected_vpn_or_tunnel: false }),
      writeFile: async (path, body) => {
        assert.equal(path, "pack.issue.md");
        fileBody = body;
      }
    }
  );
  assert.equal(result.exitCode, 0);
  assert.match(fileBody, /Report JSON Bundle/);
  assert.match(fileBody, /"reports":/);
  assert.match(fileBody, /"target": "example.com"/);
});

test("CLI binary runs as a subprocess", { skip: canRunSubprocessCli ? false : "sandbox blocks child process stdout" }, async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "version"]);
  assert.match(stdout, /^0\.3\.0\n$/);
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

function fakeReport(overrides = {}) {
  const target = overrides.target || "github.com";
  const environment = overrides.environment || { suspected_vpn_or_tunnel: false };
  return {
    schema_version: "1.0",
    tool_version: "0.3.0",
    timestamp_utc: "2026-04-27T12:00:00.000Z",
    target,
    country: "RU",
    region: "Moscow",
    network: { asn: 12389, provider: "Rostelecom", connection_type: "home" },
    environment: {
      suspected_vpn_or_tunnel: Boolean(environment.suspected_vpn_or_tunnel)
    },
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
