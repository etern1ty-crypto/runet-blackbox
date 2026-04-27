export const DIAGNOSIS_METADATA = {
  ok: {
    title: "Reachable",
    severity: "ok",
    summary: "The measured path completed successfully.",
    next_step: "Submit the report as a healthy control sample."
  },
  dns_timeout: {
    title: "DNS timeout",
    severity: "degraded",
    summary: "The resolver did not answer in time.",
    next_step: "Repeat with the system resolver and, if appropriate, with a public resolver for comparison."
  },
  dns_nxdomain: {
    title: "DNS NXDOMAIN",
    severity: "degraded",
    summary: "DNS reported that the target name does not exist.",
    next_step: "Check for typos and compare with another resolver before drawing conclusions."
  },
  dns_suspicious_answer: {
    title: "Suspicious DNS answer",
    severity: "degraded",
    summary: "DNS returned an answer that looks unusual for the target.",
    next_step: "Collect more reports from other resolvers and providers."
  },
  dns_failure: {
    title: "DNS failure",
    severity: "degraded",
    summary: "DNS failed with a resolver error.",
    next_step: "Retry later and compare resolvers."
  },
  tcp_timeout: {
    title: "TCP timeout",
    severity: "degraded",
    summary: "The TCP connection did not complete before the timeout.",
    next_step: "Collect comparison reports from the same provider and another provider."
  },
  tcp_reset: {
    title: "TCP reset",
    severity: "degraded",
    summary: "The TCP connection was reset.",
    next_step: "Repeat the measurement to confirm the reset is stable."
  },
  tcp_refused: {
    title: "TCP refused",
    severity: "warning",
    summary: "The host actively refused the TCP connection.",
    next_step: "This can be normal service behavior; compare against other networks."
  },
  possible_tls_dpi_or_middlebox_reset: {
    title: "Possible TLS middlebox reset",
    severity: "degraded",
    summary: "The TLS handshake was reset after ClientHello-like activity.",
    next_step: "Collect several reports before treating this as a filtering signal."
  },
  tls_timeout: {
    title: "TLS timeout",
    severity: "degraded",
    summary: "TCP connected, but the TLS handshake did not finish.",
    next_step: "Compare against another network and repeat after a short delay."
  },
  tls_certificate_mismatch: {
    title: "TLS certificate mismatch",
    severity: "degraded",
    summary: "The certificate chain or name did not match expectations.",
    next_step: "Do not log in through this path; collect evidence and compare networks."
  },
  http_blockpage_suspected: {
    title: "Possible HTTP blockpage",
    severity: "degraded",
    summary: "The HTTP response matched conservative blockpage indicators.",
    next_step: "Submit the sanitized report; raw page bodies are intentionally not stored."
  },
  http_unexpected_redirect: {
    title: "Unexpected HTTP redirect",
    severity: "warning",
    summary: "The response redirected in an unexpected way.",
    next_step: "Compare final hosts across networks."
  },
  service_global_outage_possible: {
    title: "Possible service outage",
    severity: "warning",
    summary: "Both TCP/80 and TCP/443 timed out from this vantage point.",
    next_step: "Do not assume filtering without reports from other networks."
  },
  local_network_problem_possible: {
    title: "Possible local network problem",
    severity: "warning",
    summary: "Signals point to a local or transient connectivity issue.",
    next_step: "Retry on another connection if available."
  },
  measurement_error: {
    title: "Measurement error",
    severity: "warning",
    summary: "The tool hit an internal or unsupported network error.",
    next_step: "Open a bug report with the sanitized output."
  },
  insufficient_data: {
    title: "Insufficient data",
    severity: "unknown",
    summary: "The report does not contain enough decisive signals.",
    next_step: "Run again with default checks enabled."
  }
};

export function diagnosisMetadata(category) {
  return DIAGNOSIS_METADATA[category] || DIAGNOSIS_METADATA.insufficient_data;
}
