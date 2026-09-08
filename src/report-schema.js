import { REPORT_SCHEMA, validateShape } from "./report-fields.js";
import { normalizeTarget } from "./target.js";
import { validateMeasurementTarget } from "./target-policy.js";

export function validateReport(report) {
  const errors = validateShape(report, REPORT_SCHEMA);
  if (report && typeof report === "object") {
    if (typeof report.target === "string") {
      const target = validateMeasurementTarget(report.target);
      if (!target.valid) errors.push("report.target is not a safe public target");
      else if (normalizeTarget(report.target) !== report.target) errors.push("report.target must be a canonical hostname or IP");
    }
    if (typeof report.timestamp_utc === "string" && !isIsoTimestamp(report.timestamp_utc)) errors.push("report.timestamp_utc must be an ISO timestamp");
    const http = report.results?.http;
    if (typeof http?.final_host === "string" && !validateMeasurementTarget(http.final_host).valid) errors.push("report.results.http.final_host is not public");
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)].slice(0, 40) };
}

export function isIsoTimestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  return date.toISOString() === (value.includes(".") ? value : value.replace("Z", ".000Z"));
}
