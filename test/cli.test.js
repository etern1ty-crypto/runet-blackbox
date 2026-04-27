import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const bin = new URL("../cli/bin/runet-blackbox.js", import.meta.url).pathname;

test("CLI version prints version", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "version"]);
  assert.match(stdout, /^0\.1\.0\n$/);
});

test("CLI help includes examples and exit codes", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "help"]);
  assert.match(stdout, /Examples:/);
  assert.match(stdout, /Exit codes:/);
});

test("CLI sample prints valid JSON with report id", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "sample"]);
  const report = JSON.parse(stdout);
  assert.equal(report.target, "example.com");
  assert.match(report.report_id, /^rbb_[a-f0-9]{20}$/);
});

test("CLI unknown command exits with usage code", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [bin, "nope"]),
    (error) => {
      assert.equal(error.code, 64);
      assert.match(error.stderr, /unknown command/);
      return true;
    }
  );
});

test("CLI rejects unsafe local targets before probing", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [bin, "check", "localhost", "--no-http"]),
    (error) => {
      assert.equal(error.code, 64);
      assert.match(error.stderr, /unsafe measurement target/);
      return true;
    }
  );
});
