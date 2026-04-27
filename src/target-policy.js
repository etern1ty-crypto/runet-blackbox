import net from "node:net";
import { normalizeTarget } from "./target.js";

export function validateMeasurementTarget(input) {
  let target;
  try {
    target = normalizeTarget(input);
  } catch (error) {
    return { valid: false, target: null, reason: error.message };
  }

  const ipVersion = net.isIP(target);
  if (ipVersion === 4 && !isPublicIPv4(target)) {
    return { valid: false, target, reason: "target IP is private, loopback, multicast, or reserved" };
  }
  if (ipVersion === 6 && !isPublicIPv6(target)) {
    return { valid: false, target, reason: "target IPv6 is private, loopback, multicast, or reserved" };
  }
  if (!ipVersion && isLocalHostname(target)) {
    return { valid: false, target, reason: "target hostname is local or reserved" };
  }

  return { valid: true, target, reason: null };
}

export function assertMeasurementTarget(input) {
  const validation = validateMeasurementTarget(input);
  if (!validation.valid) {
    const error = new Error(`unsafe measurement target: ${validation.reason}`);
    error.exitCode = 64;
    throw error;
  }
  return validation.target;
}

function isLocalHostname(target) {
  return (
    target === "localhost" ||
    target.endsWith(".localhost") ||
    target.endsWith(".local") ||
    target.endsWith(".internal") ||
    target.endsWith(".home.arpa") ||
    target.endsWith(".test") ||
    target.endsWith(".invalid")
  );
}

function isPublicIPv4(value) {
  const octets = value.split(".").map(Number);
  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 0) return false;
  if (a === 192 && b === 88) return false;
  if (a === 192 && b === 168) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51) return false;
  if (a === 203 && b === 0) return false;
  return true;
}

function isPublicIPv6(value) {
  const normalized = value.toLowerCase();
  if (normalized === "::" || normalized === "::1") return false;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return false;
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return false;
  if (normalized.startsWith("ff")) return false;
  if (normalized.startsWith("2001:db8")) return false;
  return true;
}
