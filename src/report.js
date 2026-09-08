import { SCHEMA_VERSION, TOOL_VERSION } from "./constants.js";
import { classifyReport } from "./diagnosis.js";
import { stableHash } from "./hash.js";
import { sanitizeReport } from "./privacy.js";
import { validateReport } from "./report-schema.js";
import { normalizeCountry, parseAsn } from "./target.js";
import { assertMeasurementTarget } from "./target-policy.js";
import { toIsoTimestamp } from "./time.js";

export function buildReport({ target, country, region, provider, asn, connectionType, results, environment, timestamp = new Date() }) {
  return prepareReport({
    schema_version: SCHEMA_VERSION, tool_version: TOOL_VERSION, timestamp_utc: toIsoTimestamp(timestamp),
    target: assertMeasurementTarget(target), country: normalizeCountry(country ?? "ZZ"), region: region || "unknown",
    network: { asn: parseAsn(asn), provider: provider || "unknown", connection_type: connectionType || "unknown" },
    environment: { suspected_vpn_or_tunnel: Boolean(environment?.suspected_vpn_or_tunnel) },
    results: results || {}, diagnosis: classifyReport({ results })
  });
}

/** All ingestion paths use this boundary. Claims and IDs are never authoritative. */
export function prepareReport(raw) {
  const report = sanitizeReport(raw);
  delete report.report_id;
  report.diagnosis = classifyReport(report);
  const validation = validateReport(report);
  if (!validation.valid) throw new Error(validation.errors.join("; "));
  report.schema_version = SCHEMA_VERSION;
  report.report_id = reportId(report);
  return report;
}

export function reportId(report) {
  const { report_id: _ignored, ...content } = report;
  return `rbb_${stableHash(content).slice(0, 20)}`;
}
