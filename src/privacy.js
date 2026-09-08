import { CONNECTION_TYPES } from "./constants.js";
import { CHECK_FIELDS, isRecord } from "./report-fields.js";
import { normalizeCountry, normalizeTarget, parseAsn } from "./target.js";
import { validateMeasurementTarget } from "./target-policy.js";
import { roundTimestampUtc } from "./time.js";
import { isIsoTimestamp } from "./report-schema.js";

export const SENSITIVE_KEYS = new Set(["ip", "ips", "client_ip", "source_ip", "remote_ip", "remote_address", "local_address", "local_ip", "addresses", "answers", "body", "body_preview", "raw_body", "headers", "raw_headers", "request_headers", "response_headers", "cookies", "cookie", "set-cookie", "authorization", "proxy-authorization", "x-forwarded-for", "forwarded", "cf-connecting-ip", "true-client-ip", "user-agent", "user_agent", "traceroute", "trace", "hops", "packet_capture", "pcap", "__proto__", "constructor", "prototype"]);

/** Only reviewed fields survive. Free-text labels still require human review before publication. */
export function sanitizeReport(report) {
  if (!isRecord(report)) throw new TypeError("report must be an object");
  const out = {};
  for (const key of ["schema_version", "tool_version", "report_id"]) if (report[key] !== undefined) out[key] = report[key];
  if (report.target !== undefined) out.target = normalizeTarget(report.target);
  if (report.country !== undefined) out.country = normalizeCountry(report.country);
  if (report.region !== undefined) out.region = sanitizeLabel(report.region);
  if (report.timestamp_utc !== undefined) {
    if (!isIsoTimestamp(report.timestamp_utc)) throw new Error("timestamp_utc must be an ISO timestamp");
    out.timestamp_utc = roundTimestampUtc(report.timestamp_utc);
  }
  if (report.network !== undefined) {
    if (!isRecord(report.network)) throw new TypeError("network must be an object");
    out.network = { asn: parseAsn(report.network.asn), provider: sanitizeLabel(report.network.provider), connection_type: CONNECTION_TYPES.has(report.network.connection_type) ? report.network.connection_type : "unknown" };
  }
  if (report.environment !== undefined) {
    if (!isRecord(report.environment)) throw new TypeError("environment must be an object");
    out.environment = { suspected_vpn_or_tunnel: report.environment.suspected_vpn_or_tunnel === true };
  }
  if (report.results !== undefined) {
    if (!isRecord(report.results)) throw new TypeError("results must be an object");
    out.results = {};
    for (const [name, value] of Object.entries(report.results)) {
      if (!Object.hasOwn(CHECK_FIELDS, name)) continue;
      if (!isRecord(value)) { out.results[name] = value; continue; }
      out.results[name] = sanitizeCheck(name, value);
    }
  }
  if (report.diagnosis !== undefined) {
    if (!isRecord(report.diagnosis)) throw new TypeError("diagnosis must be an object");
    out.diagnosis = {
      category: report.diagnosis.category,
      confidence: Number.isFinite(report.diagnosis.confidence) ? Math.max(0, Math.min(1, Number(report.diagnosis.confidence.toFixed(2)))) : report.diagnosis.confidence,
      signals: Array.isArray(report.diagnosis.signals) ? report.diagnosis.signals.filter(value => typeof value === "string").slice(0, 10).map(value => sanitizeLabel(value, "redacted", 160)) : report.diagnosis.signals
    };
  }
  return out;
}

function sanitizeCheck(name, value) {
  const out = {};
  for (const key of Object.keys(CHECK_FIELDS[name])) {
    if (value[key] === undefined) continue;
    if (key === "error") {
      out.error = typeof value.error === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(value.error) ? value.error : "ERR_NETWORK";
    } else if (key === "body_sha256" || key === "headers_hash") {
      if (typeof value[key] === "string" && /^[a-f0-9]{64}$/.test(value[key])) out[key] = value[key];
    } else if (key === "final_host") {
      if (validateMeasurementTarget(value[key]).valid) out[key] = normalizeTarget(value[key]);
    } else if (key === "resolver") {
      out.resolver = ["system", "explicit", "literal"].includes(value.resolver) ? value.resolver : "explicit";
    } else if (key === "resolvers") {
      if (!Array.isArray(value.resolvers)) { out.resolvers = value.resolvers; continue; }
      out.resolvers = value.resolvers.slice(0, 3).map((entry, index) => {
        if (!isRecord(entry)) return entry;
        const clean = { resolver: `comparison-${index + 1}`, status: entry.status, addresses_count: entry.addresses_count };
        if (Number.isFinite(entry.latency_ms)) clean.latency_ms = Math.round(entry.latency_ms);
        return clean;
      });
    } else {
      // Preserve bad types for validation; never silently turn malformed values into success.
      out[key] = key === "latency_ms" && Number.isFinite(value[key]) ? Math.round(value[key]) : value[key];
    }
  }
  return out;
}

export function sanitizeLabel(input, fallback = "unknown", max = 80) {
  if (typeof input !== "string") return fallback;
  const value = input.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, " ")
    .replace(/\bhttps?:\/\/\S+|\b[^\s@]+@[^\s@]+\.[^\s@]+|\b(?:\d{1,3}\.){3}\d{1,3}\b|\b[0-9a-f]*:[0-9a-f:]+\b/gi, "[redacted]")
    .replace(/(?:bearer\s+|(?:token|password|secret|api[_-]?key)\s*[=:]\s*)\S+/gi, "[redacted]")
    .replace(/\s+/g, " ").trim().slice(0, max);
  return value || fallback;
}

/** Legacy helper; not a security boundary. sanitizeReport uses an allowlist instead. */
export function stripSensitive(value, depth = 0) {
  if (depth > 20) return null;
  if (Array.isArray(value)) return value.slice(0, 256).map(item => stripSensitive(item, depth + 1));
  if (!isRecord(value)) return value;
  const clean = {};
  for (const [key, nested] of Object.entries(value)) if (!SENSITIVE_KEYS.has(key.toLowerCase())) clean[key] = stripSensitive(nested, depth + 1);
  return clean;
}

export function findSensitivePaths(value, prefix = []) {
  if (prefix.length > 20) return [];
  if (Array.isArray(value)) return value.slice(0, 256).flatMap((item, index) => findSensitivePaths(item, [...prefix, String(index)]));
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, nested]) => SENSITIVE_KEYS.has(key.toLowerCase()) ? [[...prefix, key].join(".")] : findSensitivePaths(nested, [...prefix, key]));
}
