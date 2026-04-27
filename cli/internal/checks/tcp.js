import net from "node:net";
import { elapsedMs, errorMessage, statusFromNetworkError } from "./util.js";

export function checkTcp(target, port, options = {}) {
  const startedAt = performance.now();
  const timeoutMs = options.timeoutMs || 5000;

  return new Promise((resolve) => {
    const socket = net.createConnection({ host: target, port });
    let settled = false;

    function done(result) {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ...result, latency_ms: elapsedMs(startedAt) });
    }

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done({ status: "ok", port }));
    socket.once("timeout", () => done({ status: "timeout", port, error: "timeout" }));
    socket.once("error", (error) => done({ status: statusFromNetworkError(error), port, error: errorMessage(error) }));
  });
}
