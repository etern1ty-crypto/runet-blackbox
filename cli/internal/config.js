import fs from "node:fs/promises";
import { assertRootTarget } from "../../src/target-policy.js";
import { isRecord } from "../../src/report-fields.js";
import { loadPack } from "./packs.js";
import { usageError, validateOptions } from "./args.js";

const CONFIG_KEYS = new Set(["version", "pack", "targets", "timeoutMs", "concurrency", "maxRedirects", "maxBodyBytes", "country", "region", "provider", "asn", "connectionType", "dnsServer", "dnsCompareServers"]);

/** Configuration never controls output paths or changes the public-address boundary. */
export async function resolveCheckPlan(args) {
  let config = {};
  if (args.config) {
    try { config = JSON.parse(await boundedText(args.config, 65536)); }
    catch (error) { if (error.exitCode) throw error; throw usageError("configuration must be readable UTF-8 JSON"); }
    validateConfig(config);
  }
  const options = { ...args, ...config };
  for (const key of args.explicit) options[key] = args[key];
  // Keep the command and output controls entirely CLI-owned.
  for (const key of ["command", "json", "pretty", "output", "junit", "prometheus", "issueFile", "issueUrl", "copyIssue", "failOnDegraded", "http", "verbose"]) options[key] = args[key];
  validateOptions(options);
  let entries;
  let pack;
  if (args.target) entries = [args.target];
  else if (args.targetsFile) {
    const text = await boundedText(args.targetsFile, 16384);
    entries = text.split(/\r?\n/).map(line => line.replace(/#.*$/, "").trim()).filter(Boolean);
  } else if (args.explicit.includes("pack")) pack = loadPack(args.pack);
  else if (config.targets) entries = config.targets;
  else pack = loadPack(config.pack || args.pack || "ci");
  if (pack) entries = pack.targets;
  if (!Array.isArray(entries) || !entries.length || entries.length > 32) throw usageError("provide 1..32 targets");
  const targets = entries.map(entry => normalizeEntry(entry));
  if (new Set(targets.map(entry => entry.target)).size !== targets.length) throw usageError("duplicate normalized targets are not allowed");
  return { options, targets, pack: pack || { name: targets.length === 1 ? "single" : "custom", label: "Configured dependencies", label_ru: "Зависимости команды", targets: targets.map(entry => entry.target) } };
}

export function validateConfig(config) {
  if (!isRecord(config) || config.version !== 1) throw usageError("configuration requires version: 1");
  if (Object.keys(config).some(key => !CONFIG_KEYS.has(key))) throw usageError("configuration contains unsupported fields");
  if (config.pack !== undefined && (typeof config.pack !== "string" || !config.pack)) throw usageError("pack must be a non-empty string");
  if (config.pack && config.targets !== undefined) throw usageError("configuration accepts pack or targets, not both");
  if (config.targets !== undefined) {
    if (!Array.isArray(config.targets) || !config.targets.length || config.targets.length > 32) throw usageError("targets must contain 1..32 entries");
    config.targets.forEach(normalizeEntry);
  }
  for (const key of ["timeoutMs", "concurrency", "maxRedirects", "maxBodyBytes"]) if (config[key] !== undefined && !Number.isInteger(config[key])) throw usageError(`${key} in JSON must be an integer`);
}

function normalizeEntry(entry) {
  if (typeof entry === "string") return { target: assertRootTarget(entry) };
  if (!isRecord(entry) || Object.keys(entry).some(key => !["target", "expectedStatusCodes"].includes(key))) throw usageError("target entry accepts only target and expectedStatusCodes");
  const target = assertRootTarget(entry.target);
  const codes = entry.expectedStatusCodes;
  if (codes !== undefined && (!Array.isArray(codes) || !codes.length || codes.length > 20 || codes.some(code => !Number.isInteger(code) || code < 200 || code > 599 || (code >= 300 && code < 400)) || new Set(codes).size !== codes.length)) throw usageError("expectedStatusCodes requires 1..20 distinct final HTTP codes (200..299 or 400..599)");
  return { target, ...(codes ? { expectedStatusCodes: [...codes] } : {}) };
}

async function boundedText(file, limit) {
  let handle;
  try {
    handle = await fs.open(file, "r");
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > limit) throw usageError(`input file must be a regular file no larger than ${limit} bytes`);
    const buffer = Buffer.alloc(limit + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > limit) throw usageError("input file is too large");
    return buffer.subarray(0, bytesRead).toString("utf8").replace(/^\uFEFF/, "");
  } catch (error) {
    if (error.exitCode) throw error;
    throw usageError("cannot read configuration or targets file");
  } finally { await handle?.close(); }
}
