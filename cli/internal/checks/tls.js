import tls from "node:tls";
import net from "node:net";
import { elapsedMs, errorMessage, statusFromNetworkError, throwIfAborted, abortError } from "./util.js";

export function checkTls(target, options = {}) {
  throwIfAborted(options.signal);
  const startedAt = performance.now();
  const port = options.port ?? 443;
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
      socket = (options.connectTls || tls.connect)({
        host: options.address || target,
        port,
        servername: net.isIP(target) ? undefined : target,
        rejectUnauthorized: true,
        checkServerIdentity: (_hostname, certificate) => tls.checkServerIdentity(target, certificate),
        minVersion: "TLSv1.2",
        ALPNProtocols: ["http/1.1"],
        ...(options.ca ? { ca: options.ca } : {})
      });
      socket.once("secureConnect", () => {
        const identityError = tls.checkServerIdentity(target, socket.getPeerCertificate());
        if (!socket.authorized || identityError) {
          const error = identityError || { code: socket.authorizationError || "ERR_CERT_AUTHORITY_INVALID" };
          finish({ status: statusFromNetworkError(error), authorized: false, error: errorMessage(error) });
          return;
        }
        finish({ status: "ok", protocol: socket.getProtocol(), alpn: socket.alpnProtocol || null, authorized: true });
      });
      socket.once("error", error => finish({ status: statusFromNetworkError(error), authorized: false, error: errorMessage(error) }));
    } catch (error) {
      finish({ status: statusFromNetworkError(error), error: errorMessage(error) });
    }
  });
}
