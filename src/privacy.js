import { CONNECTION_TYPES } from "./constants.js";
import { normalizeCountry, normalizeOptionalText, normalizeTarget, parseAsn } from "./target.js";
import { roundTimestampUtc } from "./time.js";

const SENSITIVE_KEYS = new Set([
  "ip",
  "ips",
  "client_ip",
  "source_ip",
  "remote_ip",
  "remote_address",
  "local_address",
  "local_ip",
  "addresses",
  "answers",
  "body",
  "body_preview",
  "raw_body",
  "headers",
  "raw_headers",
  "cookies",
  "set-cookie",
  "traceroute",
  "trace",
  "hops",
  "packet_capture",
  "pcap"
]);

export function sanitizeReport(report) {
  const sanitized = stripSensitive(report);

  if (sanitized.schema_version !== undefined) {
    sanitized.schema_version = String(sanitized.schema_version);
  }
  if (sanitized.tool_version !== undefined) {
    sanitized.tool_version = String(sanitized.tool_version);
  }
  if (sanitized.target !== undefined) {
    sanitized.target = normalizeTarget(sanitized.target);
  }
  if (sanitized.country !== undefined) {
    sanitized.country = normalizeCountry(sanitized.country);
  }
  if (sanitized.region !== undefined) {
    sanitized.region = normalizeOptionalText(sanitized.region);
  }
  if (sanitized.timestamp_utc !== undefined) {
    sanitized.timestamp_utc = roundTimestampUtc(sanitized.timestamp_utc);
  }

  if (sanitized.network !== undefined) {
    sanitized.network = sanitizeNetwork(sanitized.network);
  }
  if (sanitized.results !== undefined) {
    sanitized.results = sanitizeResults(sanitized.results);
  }

  if (sanitized.diagnosis) {
    sanitized.diagnosis = {
      category: String(sanitized.diagnosis.category || "insufficient_data"),
      confidence: clampConfidence(sanitized.diagnosis.confidence),
      signals: Array.isArray(sanitized.diagnosis.signals)
        ? sanitized.diagnosis.signals.map((signal) => String(signal)).slice(0, 10)
        : []
    };
  }

  return sanitized;
}

export function stripSensitive(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stripSensitive(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const clean = {};
  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      continue;
    }
    clean[key] = stripSensitive(nested);
  }
  return clean;
}

function sanitizeNetwork(network = {}) {
  let asn = null;
  try {
    asn = parseAsn(network.asn);
  } catch {
    asn = null;
  }
  const connectionType = CONNECTION_TYPES.has(network.connection_type) ? network.connection_type : "unknown";
  return {
    asn,
    provider: normalizeOptionalText(network.provider),
    connection_type: connectionType
  };
}

function sanitizeResults(results) {
  const clean = {};
  for (const [name, value] of Object.entries(results)) {
    if (!value || typeof value !== "object") {
      continue;
    }
    clean[name] = stripSensitive(value);
    if (typeof clean[name].latency_ms === "number") {
      clean[name].latency_ms = Math.max(0, Math.round(clean[name].latency_ms));
    }
  }
  return clean;
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.max(0, Math.min(1, Number(number.toFixed(2))));
}
