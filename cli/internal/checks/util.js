export function elapsedMs(startedAt) {
  return Math.max(0, Number((performance.now() - startedAt).toFixed(2)));
}

export function errorMessage(error) {
  const code = error?.code;
  // Never publish OS error messages: they can embed addresses and private paths.
  return typeof code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(code) ? code : "ERR_NETWORK";
}

export function statusFromNetworkError(error) {
  const code = error?.code;
  if (code === "ABORT_ERR") return "aborted";
  if (["ETIMEDOUT", "ETIMEOUT", "EAI_AGAIN"].includes(code)) return "timeout";
  if (["ECONNRESET", "EPIPE", "ERR_STREAM_PREMATURE_CLOSE"].includes(code)) return "reset";
  if (code === "ECONNREFUSED") return "connection_refused";
  if (code === "ENOTFOUND") return "nxdomain";
  if (code === "ESERVFAIL") return "servfail";
  if (code === "EREFUSED") return "refused";
  if (["ENETUNREACH", "EHOSTUNREACH", "EADDRNOTAVAIL", "ENETDOWN"].includes(code)) return "unreachable";
  if (code === "ERR_TLS_CERT_ALTNAME_INVALID") return "certificate_mismatch";
  if (code && /CERT|SELF_SIGNED|UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER/.test(code)) return "certificate_error";
  return "error";
}

export function abortError() {
  return Object.assign(new Error("measurement cancelled"), { code: "ABORT_ERR", exitCode: 130 });
}

export function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}

/** A wall-clock deadline, not a socket inactivity timeout. Always disposes listeners. */
export function withTimeout(promise, timeoutMs, onTimeout, signal) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", aborted);
      if (error) reject(error); else resolve(value);
    };
    const cancel = (error) => {
      try { onTimeout?.(); } catch { /* Cleanup must not mask the timeout. */ }
      finish(error);
    };
    const aborted = () => cancel(abortError());
    // Attach both handlers even if already aborted, preventing late unhandled rejections.
    Promise.resolve(promise).then(value => finish(null, value), error => finish(error));
    if (signal?.aborted) return aborted();
    signal?.addEventListener("abort", aborted, { once: true });
    timer = setTimeout(() => cancel(Object.assign(new Error("operation timed out"), { code: "ETIMEDOUT" })), timeoutMs);
  });
}

export function pinnedLookup(address, family) {
  return (_hostname, options, callback) => {
    if (typeof options === "function") { callback = options; options = {}; }
    const entry = { address, family };
    queueMicrotask(() => options?.all ? callback(null, [entry]) : callback(null, address, family));
  };
}
