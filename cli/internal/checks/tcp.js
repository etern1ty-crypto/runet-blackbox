import net from "node:net";
import { elapsedMs, errorMessage, statusFromNetworkError, throwIfAborted, abortError } from "./util.js";

export function checkTcp(target, port, options = {}) {
  throwIfAborted(options.signal);
  const startedAt = performance.now();
  return new Promise((resolve, reject) => {
    let socket;
    let settled = false;
    const finish = (result, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", aborted);
      socket?.destroy();
      if (error) reject(error); else resolve({ ...result, port, latency_ms: elapsedMs(startedAt) });
    };
    const aborted = () => finish(null, abortError());
    const timer = setTimeout(() => finish({ status: "timeout", error: "ETIMEDOUT" }), options.timeoutMs ?? 5000);
    options.signal?.addEventListener("abort", aborted, { once: true });
    try {
      // runCheck supplies a vetted literal: never resolve the hostname a second time.
      socket = (options.connect || net.createConnection)({ host: options.address || target, port });
      socket.once("connect", () => finish({ status: "ok" }));
      socket.once("error", error => finish({ status: statusFromNetworkError(error), error: errorMessage(error) }));
    } catch (error) {
      finish({ status: statusFromNetworkError(error), error: errorMessage(error) });
    }
  });
}
