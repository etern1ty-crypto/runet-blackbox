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

test("CLI binary runs as a subprocess", { skip: canRunSubprocessCli ? false : "sandbox blocks child process stdout" }, async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "version"]);
  assert.match(stdout, /^0\.1\.0\n$/);
});

async function runCliCapture(argv) {
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(argv, {
    stdout: { write: (chunk) => { stdout += chunk; } },
    stderr: { write: (chunk) => { stderr += chunk; } }
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
