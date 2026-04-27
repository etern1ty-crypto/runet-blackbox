#!/usr/bin/env node
import fs from "node:fs/promises";
import { TOOL_VERSION } from "../../src/constants.js";
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

  const report = await runCheck(args.target, args);
  const json = JSON.stringify(report, null, args.pretty ? 2 : 0);

  if (args.output) {
    await fs.writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  if (args.json || args.output) {
    process.stdout.write(`${json}\n`);
  } else {
    process.stdout.write(formatHumanReport(report));
  }
}

main().catch((error) => {
  process.stderr.write(`runet-blackbox: ${error.message}\n`);
  process.exitCode = 1;
});
