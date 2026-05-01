export const SCHEMA_VERSION = "1.0";
export const TOOL_VERSION = "0.3.0";

export const CONNECTION_TYPES = new Set([
  "unknown",
  "home",
  "mobile",
  "office",
  "public_wifi",
  "hosting",
  "other"
]);

export const RESULT_STATUS = new Set([
  "ok",
  "skipped",
  "not_tested",
  "not_tested_due_to_dns_failure",
  "not_tested_due_to_tcp_failure",
  "not_tested_due_to_tls_failure",
  "timeout",
  "error",
  "nxdomain",
  "servfail",
  "refused",
  "suspicious_answer",
  "connection_refused",
  "reset",
  "reset_after_client_hello",
  "certificate_mismatch",
  "certificate_error",
  "unexpected_redirect",
  "blockpage_suspected"
]);

export const DIAGNOSIS_CATEGORIES = new Set([
  "ok",
  "dns_timeout",
  "dns_nxdomain",
  "dns_suspicious_answer",
  "dns_failure",
  "tcp_timeout",
  "tcp_reset",
  "tcp_refused",
  "possible_tls_dpi_or_middlebox_reset",
  "tls_timeout",
  "tls_certificate_mismatch",
  "http_blockpage_suspected",
  "http_unexpected_redirect",
  "service_global_outage_possible",
  "local_network_problem_possible",
  "measurement_error",
  "insufficient_data"
]);

export const PUBLIC_TIME_BUCKET_MINUTES = 15;
