import { SCHEMA_VERSION, TOOL_VERSION } from "./constants.js";
import { classifyReport } from "./diagnosis.js";
import { sanitizeReport } from "./privacy.js";
import { isValidTarget, normalizeCountry, normalizeOptionalText, normalizeTarget, parseAsn } from "./target.js";
import { toIsoTimestamp } from "./time.js";

export function buildReport({ target, country, region, provider, asn, connectionType, results, timestamp = new Date() }) {
  if (!isValidTarget(target)) {
    throw new Error("target must be a valid domain or IP address");
  }

  const report = {
    schema_version: SCHEMA_VERSION,
    tool_version: TOOL_VERSION,
    timestamp_utc: toIsoTimestamp(timestamp),
    target: normalizeTarget(target),
    country: normalizeCountry(country),
    region: normalizeOptionalText(region),
    network: {
      asn: parseAsn(asn),
      provider: normalizeOptionalText(provider),
      connection_type: connectionType || "unknown"
    },
    results: results || {}
  };

  report.diagnosis = classifyReport(report);
  return sanitizeReport(report);
}
