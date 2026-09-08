import { CONNECTION_TYPES, DIAGNOSIS_CATEGORIES, RESULT_STATUS } from "./constants.js";

const text = (maxLength = 80) => ({ type: "string", minLength: 1, maxLength });
const number = (maximum = 3_600_000) => ({ type: "number", minimum: 0, maximum });
const integer = (maximum) => ({ type: "integer", minimum: 0, maximum });
const boolean = { type: "boolean" };
const hash = { type: "string", pattern: "^[a-f0-9]{64}$" };
const common = { status: { enum: [...RESULT_STATUS] }, latency_ms: number(), error: { type: "string", pattern: "^[A-Z][A-Z0-9_]{0,63}$" } };
const object = (properties, required = []) => ({ type: "object", additionalProperties: false, required, properties });
const resolver = object({ ...common, resolver: { enum: ["comparison-1", "comparison-2", "comparison-3"] }, addresses_count: integer(256) }, ["status", "resolver", "addresses_count"]);

export const CHECK_FIELDS = {
  dns: { ...common, addresses_count: integer(256), resolver: { enum: ["system", "explicit", "literal"] } },
  dns_compare: { ...common, resolvers: { type: "array", maxItems: 3, items: resolver } },
  tcp_80: { ...common, port: { const: 80 } },
  tcp_443: { ...common, port: { const: 443 } },
  tls: { ...common, port: { const: 443 }, protocol: { enum: ["TLSv1.2", "TLSv1.3"] }, alpn: { enum: ["h2", "http/1.1", null] }, authorized: boolean },
  http: { ...common, expected_status_codes: { type: "array", maxItems: 20, items: { type: "integer", minimum: 200, maximum: 599 } }, status_code: { type: "integer", minimum: 100, maximum: 599 }, final_host: text(253), redirect_count: integer(5), redirect_cross_host: boolean, content_length: integer(Number.MAX_SAFE_INTEGER), body_truncated: boolean, body_sha256: hash, headers_hash: hash, blockpage_suspected: boolean },
  // Reserved compatibility field. No QUIC probe is implemented or advertised.
  quic: { ...common }
};

export const REPORT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://etern1ty-crypto.github.io/runet-blackbox/schemas/report.schema.json",
  title: "Runet Blackbox sanitized report (legacy 1.0 / current 1.1)",
  ...object({
    report_id: { type: "string", pattern: "^rbb_[a-f0-9]{20}$" },
    schema_version: { enum: ["1.0", "1.1"] }, tool_version: { type: "string", pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$", maxLength: 40 },
    timestamp_utc: { type: "string", format: "date-time", pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$" },
    target: text(253), country: { type: "string", pattern: "^[A-Z]{2}$" }, region: text(),
    network: object({ asn: { type: ["integer", "null"], minimum: 1, maximum: 4294967295 }, provider: text(), connection_type: { enum: [...CONNECTION_TYPES] } }, ["asn", "provider", "connection_type"]),
    environment: object({ suspected_vpn_or_tunnel: boolean }),
    results: object(Object.fromEntries(Object.entries(CHECK_FIELDS).map(([name, properties]) => [name, object(properties, ["status"])])), ["dns"]),
    diagnosis: object({ category: { enum: [...DIAGNOSIS_CATEGORIES] }, confidence: { type: "number", minimum: 0, maximum: 1 }, signals: { type: "array", maxItems: 10, items: text(160) } }, ["category", "confidence", "signals"])
  }, ["schema_version", "tool_version", "timestamp_utc", "target", "country", "region", "network", "results", "diagnosis"])
};

/** Evaluates only the JSON Schema vocabulary used above; unknown schema keywords are not accepted as validation features. */
export function validateShape(value, schema, path = "report", errors = []) {
  if (schema.const !== undefined && value !== schema.const) errors.push(`${path} must equal ${schema.const}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path} has an unsupported value`);
  const types = schema.type ? [schema.type].flat() : [];
  const matches = type => type === "null" ? value === null : type === "array" ? Array.isArray(value)
    : type === "object" ? isRecord(value) : type === "integer" ? Number.isSafeInteger(value)
    : type === "number" ? Number.isFinite(value) : typeof value === type;
  if (types.length && !types.some(matches)) { errors.push(`${path} must be ${types.join(" or ")}`); return errors; }
  if (typeof value === "string") {
    if (schema.minLength && value.trim().length < schema.minLength) errors.push(`${path} is required`);
    if (schema.maxLength && value.length > schema.maxLength) errors.push(`${path} is too long`);
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) errors.push(`${path} has an invalid format`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} is below minimum`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path} exceeds maximum`);
  }
  if (Array.isArray(value)) {
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path} has too many items`);
    value.slice(0, 257).forEach((item, index) => validateShape(item, schema.items || {}, `${path}.${index}`, errors));
  }
  if (isRecord(value) && schema.properties) {
    for (const key of schema.required || []) if (value[key] === undefined) errors.push(`${path}.${key} is required`);
    for (const [key, nested] of Object.entries(value)) {
      if (Object.hasOwn(schema.properties, key)) validateShape(nested, schema.properties[key], `${path}.${key}`, errors);
      else if (schema.additionalProperties === false) errors.push(`${path} contains an unsupported field`);
    }
  }
  return errors;
}

export function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
