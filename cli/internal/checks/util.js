export function elapsedMs(startedAt) {
  return Number((performance.now() - startedAt).toFixed(2));
}

export function errorMessage(error) {
  if (!error) {
    return "unknown error";
  }
  return error.code || error.message || String(error);
}

export function statusFromNetworkError(error) {
  const code = error?.code;
  if (code === "ETIMEDOUT" || code === "ETIMEOUT") return "timeout";
  if (code === "ECONNRESET" || code === "EPIPE") return "reset";
  if (code === "ECONNREFUSED") return "connection_refused";
  if (code === "ENOTFOUND") return "nxdomain";
  if (code === "ESERVFAIL") return "servfail";
  if (code === "EREFUSED") return "refused";
  return "error";
}

export function withTimeout(promise, timeoutMs, onTimeout) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("operation timed out");
      error.code = "ETIMEDOUT";
      if (onTimeout) {
        onTimeout();
      }
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
