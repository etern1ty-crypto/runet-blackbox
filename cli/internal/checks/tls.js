import tls from "node:tls";
import { elapsedMs, errorMessage, statusFromNetworkError } from "./util.js";

export function checkTls(target, options = {}) {
  const startedAt = performance.now();
  const timeoutMs = options.timeoutMs || 5000;
  const port = options.port || 443;

  return new Promise((resolve) => {
    let settled = false;
    const socket = tls.connect({
      host: target,
      port,
      servername: target,
      rejectUnauthorized: false,
      ALPNProtocols: ["h2", "http/1.1"]
    });

    function done(result) {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ...result, latency_ms: elapsedMs(startedAt) });
    }

    socket.setTimeout(timeoutMs);
    socket.once("secureConnect", () => {
      const certificate = socket.getPeerCertificate();
      const authorizationError = socket.authorizationError || null;
      done({
        status: authorizationError === "ERR_TLS_CERT_ALTNAME_INVALID" ? "certificate_mismatch" : "ok",
        port,
        protocol: socket.getProtocol(),
        alpn: socket.alpnProtocol || null,
        authorized: socket.authorized,
        authorization_error: authorizationError,
        certificate_subject: certificate?.subject?.CN || null,
        certificate_issuer: certificate?.issuer?.CN || null,
        valid_to: certificate?.valid_to || null
      });
    });
    socket.once("timeout", () => done({ status: "timeout", port, error: "timeout" }));
    socket.once("error", (error) => {
      const status = statusFromNetworkError(error);
      done({ status: status === "reset" ? "reset_after_client_hello" : status, port, error: errorMessage(error) });
    });
  });
}
