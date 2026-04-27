import { domainToASCII } from "node:url";
import net from "node:net";

export function normalizeTarget(input) {
  if (typeof input !== "string") {
    throw new TypeError("target must be a string");
  }

  let value = input.trim();
  if (!value) {
    throw new Error("target is required");
  }

  if (value.includes("://")) {
    const url = new URL(value);
    value = url.hostname;
  } else {
    value = value.split("/")[0].split("?")[0].split("#")[0];
  }

  value = value.replace(/^\[|\]$/g, "");
  if (net.isIP(value)) {
    return value;
  }

  value = value.replace(/^\.+|\.+$/g, "").toLowerCase();
  if (value.startsWith("*.")) {
    value = value.slice(2);
  }

  const ascii = domainToASCII(value);
  if (!ascii) {
    throw new Error("target cannot be normalized to ASCII");
  }

  return ascii;
}

export function isValidTarget(input) {
  try {
    const target = normalizeTarget(input);
    if (net.isIP(target)) {
      return true;
    }
    if (target.length > 253) {
      return false;
    }
    const labels = target.split(".");
    if (labels.length < 2) {
      return false;
    }
    return labels.every((label) => {
      if (!label || label.length > 63) return false;
      return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
    });
  } catch {
    return false;
  }
}

export function normalizeCountry(input = "RU") {
  if (typeof input !== "string") {
    return "RU";
  }
  const value = input.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(value) ? value : "RU";
}

export function normalizeOptionalText(input, fallback = "unknown") {
  if (typeof input !== "string") {
    return fallback;
  }
  const value = input.trim().replace(/\s+/g, " ");
  return value || fallback;
}

export function parseAsn(input) {
  if (input === undefined || input === null || input === "") {
    return null;
  }
  const number = Number(String(input).replace(/^AS/i, ""));
  if (!Number.isInteger(number) || number < 1 || number > 4294967295) {
    throw new Error("asn must be an integer between 1 and 4294967295");
  }
  return number;
}
