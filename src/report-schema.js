import { CONNECTION_TYPES, DIAGNOSIS_CATEGORIES, RESULT_STATUS, SCHEMA_VERSION } from "./constants.js";
import { isValidTarget } from "./target.js";
import { validateMeasurementTarget } from "./target-policy.js";

const CHECK_NAMES = new Set(["dns", "tcp_80", "tcp_443", "tls", "http", "quic"]);

export function validateReport(report) {
  const errors = [];

  if (!report || typeof report !== "object" || Array.isArray(report)) {
    return { valid: false, errors: ["report must be an object"] };
  }

  requiredString(report, "schema_version", errors);
  requiredString(report, "tool_version", errors);
  requiredString(report, "timestamp_utc", errors);
  requiredString(report, "target", errors);
  requiredString(report, "country", errors);
  requiredString(report, "region", errors);

  if (report.report_id !== undefined && (typeof report.report_id !== "string" || !/^rbb_[a-f0-9]{20}$/.test(report.report_id))) {
    errors.push("report_id must match rbb_<20 hex chars>");
  }
  if (report.schema_version !== SCHEMA_VERSION) {
    errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  }
  if (typeof report.timestamp_utc === "string" && Number.isNaN(new Date(report.timestamp_utc).getTime())) {
    errors.push("timestamp_utc must be an ISO timestamp");
  }
  if (typeof report.target === "string" && !isValidTarget(report.target)) {
    errors.push("target must be a valid domain or IP address");
  }
  if (typeof report.target === "string") {
    const targetValidation = validateMeasurementTarget(report.target);
    if (!targetValidation.valid) {
      errors.push(`target is not safe to measure: ${targetValidation.reason}`);
    }
  }
  if (typeof report.country === "string" && !/^[A-Z]{2}$/.test(report.country)) {
    errors.push("country must be an ISO-3166 alpha-2 code");
  }

  validateNetwork(report.network, errors);
  validateResults(report.results, errors);
  validateDiagnosis(report.diagnosis, errors);

  return { valid: errors.length === 0, errors };
}

function requiredString(object, key, errors) {
  if (typeof object[key] !== "string" || object[key].trim() === "") {
    errors.push(`${key} is required`);
  }
}

function validateNetwork(network, errors) {
  if (!network || typeof network !== "object" || Array.isArray(network)) {
    errors.push("network must be an object");
    return;
  }
  if (!(network.asn === null || Number.isInteger(network.asn))) {
    errors.push("network.asn must be an integer or null");
  }
  if (network.asn !== null && (network.asn < 1 || network.asn > 4294967295)) {
    errors.push("network.asn is out of range");
  }
  if (typeof network.provider !== "string" || !network.provider.trim()) {
    errors.push("network.provider is required");
  }
  if (!CONNECTION_TYPES.has(network.connection_type)) {
    errors.push("network.connection_type is invalid");
  }
}

function validateResults(results, errors) {
  if (!results || typeof results !== "object" || Array.isArray(results)) {
    errors.push("results must be an object");
    return;
  }
  if (!results.dns) {
    errors.push("results.dns is required");
  }
  for (const [name, result] of Object.entries(results)) {
    if (!CHECK_NAMES.has(name)) {
      errors.push(`results.${name} is not a supported check`);
      continue;
    }
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      errors.push(`results.${name} must be an object`);
      continue;
    }
    if (!RESULT_STATUS.has(result.status)) {
      errors.push(`results.${name}.status is invalid`);
    }
    if (result.latency_ms !== undefined && (!Number.isFinite(result.latency_ms) || result.latency_ms < 0)) {
      errors.push(`results.${name}.latency_ms must be a non-negative number`);
    }
  }
}

function validateDiagnosis(diagnosis, errors) {
  if (!diagnosis || typeof diagnosis !== "object" || Array.isArray(diagnosis)) {
    errors.push("diagnosis must be an object");
    return;
  }
  if (!DIAGNOSIS_CATEGORIES.has(diagnosis.category)) {
    errors.push("diagnosis.category is invalid");
  }
  if (!Number.isFinite(diagnosis.confidence) || diagnosis.confidence < 0 || diagnosis.confidence > 1) {
    errors.push("diagnosis.confidence must be between 0 and 1");
  }
  if (!Array.isArray(diagnosis.signals)) {
    errors.push("diagnosis.signals must be an array");
  }
}
