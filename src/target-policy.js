import net from "node:net";
import { isValidTarget, normalizeTarget } from "./target.js";

const V4_DENY = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10],
  ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]
];
const V6_DENY = [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]];

/** Conservative public-unicast policy, independent of textual IPv6 spelling. */
export function isPublicAddress(address) {
  if (typeof address !== "string" || address.includes("%")) return false;
  const version = net.isIP(address);
  if (version === 4) {
    const number = ipv4Number(address);
    return !V4_DENY.some(([base, prefix]) => inSubnet(number, ipv4Number(base), prefix, 32));
  }
  if (version === 6) {
    const number = ipv6Number(address);
    // Excludes mapped/compatible IPv4, NAT64, ULA, link-local and multicast.
    return inSubnet(number, ipv6Number("2000::"), 3, 128)
      && !V6_DENY.some(([base, prefix]) => inSubnet(number, ipv6Number(base), prefix, 128));
  }
  return false;
}

export function validateMeasurementTarget(input) {
  let target;
  try {
    if (typeof input === "string" && input.includes("://")) {
      const url = new URL(input);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
        return { valid: false, target: null, reason: "only credential-free HTTP(S) targets are supported" };
      }
    }
    target = normalizeTarget(input);
  } catch {
    return { valid: false, target: null, reason: "target cannot be parsed" };
  }
  if (!isValidTarget(target)) return { valid: false, target, reason: "target must be a valid domain or IP address" };
  const ipVersion = net.isIP(target);
  if (ipVersion && !isPublicAddress(target)) {
    return { valid: false, target, reason: `target ${ipVersion === 6 ? "IPv6" : "IP"} is private, loopback, multicast, or reserved` };
  }
  if (!ipVersion && /(?:^|\.)(?:localhost|local|internal|lan|test|invalid|onion)$|(?:^|\.)home\.arpa$/i.test(target)) {
    return { valid: false, target, reason: "target hostname is local or reserved" };
  }
  return { valid: true, target, reason: null };
}

export function assertMeasurementTarget(input) {
  const validation = validateMeasurementTarget(input);
  if (!validation.valid) throw Object.assign(new Error(`unsafe measurement target: ${validation.reason}`), { exitCode: 64 });
  return validation.target;
}

/** CLI probes origin roots only: never silently test a different path or port. */
export function assertRootTarget(input) {
  const target = assertMeasurementTarget(input);
  const value = input.trim();
  if (value.includes("://")) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.pathname !== "/" || url.search || url.hash) {
      throw Object.assign(new Error("use a hostname or an HTTPS origin root; paths, queries and custom ports are not supported"), { exitCode: 64 });
    }
  } else if (/[/?#@]/.test(value)) {
    throw Object.assign(new Error("use a hostname without a path, query or credentials"), { exitCode: 64 });
  }
  return target;
}

function ipv4Number(value) {
  return value.split(".").reduce((number, octet) => (number << 8n) | BigInt(octet), 0n);
}

function ipv6Number(value) {
  let text = value.toLowerCase();
  if (text.includes(".")) {
    const colon = text.lastIndexOf(":");
    const v4 = ipv4Number(text.slice(colon + 1));
    text = text.slice(0, colon + 1) + (v4 >> 16n).toString(16) + ":" + (v4 & 65535n).toString(16);
  }
  const [left, right] = text.split("::");
  const a = left ? left.split(":") : [];
  const b = right ? right.split(":") : [];
  const parts = right === undefined ? a : [...a, ...Array(8 - a.length - b.length).fill("0"), ...b];
  return parts.reduce((number, part) => (number << 16n) | BigInt("0x" + part), 0n);
}

function inSubnet(number, base, prefix, bits) {
  const shift = BigInt(bits - prefix);
  return number >> shift === base >> shift;
}
