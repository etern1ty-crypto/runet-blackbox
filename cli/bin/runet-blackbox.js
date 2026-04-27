#!/usr/bin/env node
import { runCli } from "../internal/main.js";

process.exitCode = await runCli(process.argv.slice(2));
