import crypto from "node:crypto";

export function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function stableJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(",")}}`;
}

export function stableHash(value) {
  return sha256Hex(stableJson(value));
}
