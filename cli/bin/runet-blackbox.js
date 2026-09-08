#!/usr/bin/env node
import { runCli } from "../internal/main.js";

const controller = new AbortController();
let signalCode;
let forceTimer;
function stop(signal) {
  if (controller.signal.aborted) return;
  signalCode = signal === "SIGTERM" ? 143 : 130;
  controller.abort();
  // OS getaddrinfo is not cancellable. Bound process shutdown even on a stuck OS lookup.
  forceTimer = setTimeout(() => process.exit(signalCode), 1500);
  forceTimer.unref();
}
const interrupt = () => stop("SIGINT");
const terminate = () => stop("SIGTERM");
process.on("SIGINT", interrupt);
process.on("SIGTERM", terminate);
process.stdout.on("error", error => {
  if (error.code === "EPIPE") { controller.abort(); process.exitCode = 0; }
  else { controller.abort(); process.exitCode = 70; }
});
try {
  const code = await runCli(process.argv.slice(2), { signal: controller.signal });
  process.exitCode = signalCode || process.exitCode || code;
} finally {
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", terminate);
  if (!controller.signal.aborted) clearTimeout(forceTimer);
}
