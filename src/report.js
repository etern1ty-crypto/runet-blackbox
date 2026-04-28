import { SCHEMA_VERSION, TOOL_VERSION } from "./constants.js";
import { classifyReport } from "./diagnosis.js";
import { stableHash } from "./hash.js";
import { sanitizeReport } from "./privacy.js";
import { normalizeCountry, normalizeOptionalText, normalizeTarget, parseAsn } from "./target.js";
import { assertMeasurementTarget } from "./target-policy.js";
import { toIsoTimestamp } from "./time.js";

export function buildReport({ target, country, region, provider, asn, connectionType, results, environment, timestamp = new Date() }) {
  assertMeasurementTarget(target);

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
    environment: {
      suspected_vpn_or_tunnel: Boolean(environment?.suspected_vpn_or_tunnel)
    },
    results: results || {}
  };

  report.diagnosis = classifyReport(report);
  const sanitized = sanitizeReport(report);
  sanitized.report_id = reportId(sanitized);
  return sanitized;
}

export function reportId(report) {
  const copy = structuredClone(report);
  delete copy.report_id;
  return `rbb_${stableHash(copy).slice(0, 20)}`;
}
