import { DIAGNOSIS_CATEGORIES } from "./constants.js";

function statusOf(result) {
  return result && typeof result.status === "string" ? result.status : "not_tested";
}

function result(path, report) {
  let current = report?.results;
  for (const part of path) {
    current = current?.[part];
  }
  return current;
}

function diagnosis(category, confidence, signals) {
  if (!DIAGNOSIS_CATEGORIES.has(category)) {
    throw new Error(`unknown diagnosis category: ${category}`);
  }
  return {
    category,
    confidence: Number(confidence.toFixed(2)),
    signals
  };
}

export function classifyReport(report) {
  const dns = result(["dns"], report);
  const tcp443 = result(["tcp_443"], report);
  const tcp80 = result(["tcp_80"], report);
  const tls = result(["tls"], report);
  const http = result(["http"], report);

  const dnsStatus = statusOf(dns);
  const tcp443Status = statusOf(tcp443);
  const tcp80Status = statusOf(tcp80);
  const tlsStatus = statusOf(tls);
  const httpStatus = statusOf(http);

  if (dnsStatus === "timeout") {
    return diagnosis("dns_timeout", 0.9, ["dns timed out"]);
  }
  if (dnsStatus === "nxdomain") {
    return diagnosis("dns_nxdomain", 0.9, ["dns returned nxdomain"]);
  }
  if (dnsStatus === "suspicious_answer") {
    return diagnosis("dns_suspicious_answer", 0.78, ["dns returned suspicious answer"]);
  }
  if (["servfail", "refused", "error"].includes(dnsStatus)) {
    return diagnosis("dns_failure", 0.7, [`dns status is ${dnsStatus}`]);
  }

  if (tcp443Status === "timeout" && tcp80Status === "timeout") {
    return diagnosis("service_global_outage_possible", 0.54, ["tcp/80 and tcp/443 both timed out"]);
  }
  if (tcp443Status === "timeout") {
    return diagnosis("tcp_timeout", 0.76, ["tcp/443 timed out"]);
  }
  if (tcp443Status === "reset") {
    return diagnosis("tcp_reset", 0.72, ["tcp/443 reset"]);
  }
  if (tcp443Status === "connection_refused") {
    return diagnosis("tcp_refused", 0.62, ["tcp/443 refused connection"]);
  }

  if (tlsStatus === "reset_after_client_hello" || tlsStatus === "reset") {
    return diagnosis("possible_tls_dpi_or_middlebox_reset", 0.82, ["tls reset after client hello"]);
  }
  if (tlsStatus === "timeout") {
    return diagnosis("tls_timeout", 0.75, ["tls handshake timed out"]);
  }
  if (tlsStatus === "certificate_mismatch" || tlsStatus === "certificate_error") {
    return diagnosis("tls_certificate_mismatch", 0.72, [`tls status is ${tlsStatus}`]);
  }

  if (httpStatus === "blockpage_suspected" || http?.blockpage_suspected === true) {
    return diagnosis("http_blockpage_suspected", 0.85, ["http response matched blockpage signals"]);
  }
  if (httpStatus === "unexpected_redirect") {
    return diagnosis("http_unexpected_redirect", 0.68, ["http redirect target is unexpected"]);
  }

  if ([dnsStatus, tcp443Status, tlsStatus, httpStatus].every((status) => status === "ok")) {
    return diagnosis("ok", 0.94, ["dns, tcp, tls, and http checks passed"]);
  }

  if ([dnsStatus, tcp443Status, tlsStatus, httpStatus].some((status) => status === "error")) {
    return diagnosis("measurement_error", 0.45, ["one or more probes returned an internal error"]);
  }

  if (dnsStatus === "ok" && tcp443Status === "ok" && tlsStatus === "ok" && ["not_tested", "skipped"].includes(httpStatus)) {
    return diagnosis("ok", 0.72, ["transport checks passed; http was not tested"]);
  }

  return diagnosis("insufficient_data", 0.35, ["report does not contain enough decisive signals"]);
}
