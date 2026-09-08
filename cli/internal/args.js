import net from "node:net";
import path from "node:path";
import { parseAsn } from "../../src/target.js";
import { CONNECTION_TYPES } from "../../src/constants.js";

export function usageError(message) { return Object.assign(new Error(message), { exitCode: 64 }); }

export function parseCliArgs(argv) {
  const [command, ...rest] = argv;
  if (!command || ["help", "--help", "-h"].includes(command)) return { command: "help" };
  if (["version", "--version", "-v"].includes(command)) {
    if (rest.length) throw usageError("version accepts no options");
    return { command: "version" };
  }
  if (command === "sample") return parseSampleArgs(rest);
  if (["packs", "doctor"].includes(command)) {
    if (rest.length) throw usageError(`${command} accepts no options`);
    return { command };
  }
  if (!["check", "preflight"].includes(command)) throw usageError("unknown command; use help");
  if (rest.includes("--help") || rest.includes("-h")) return { command: "help" };
  return parseCheckArgs(rest, command);
}

export function parseCheckArgs(argv, command = "check") {
  const options = {
    command, country: "ZZ", region: "unknown", provider: "unknown", asn: null,
    connectionType: command === "preflight" ? "hosting" : "unknown",
    timeoutMs: 5000, concurrency: 2, maxRedirects: 3, maxBodyBytes: 65536,
    json: false, pretty: false, output: null, junit: null, prometheus: null,
    issueFile: null, issueUrl: false, copyIssue: false, pack: null, config: null, targetsFile: null,
    http: true, dnsServer: null, dnsCompareServers: [], failOnDegraded: command === "preflight", verbose: false
  };
  const explicit = new Set();
  const positionals = [];
  const valueOptions = { "--country": "country", "--region": "region", "--provider": "provider", "--asn": "asn", "--connection-type": "connectionType", "--timeout": "timeoutMs", "--concurrency": "concurrency", "--max-redirects": "maxRedirects", "--max-body-bytes": "maxBodyBytes", "--dns": "dnsServer", "--dns-server": "dnsServer", "--compare-dns": "dnsCompareServers", "--dns-compare": "dnsCompareServers", "--output": "output", "-o": "output", "--junit": "junit", "--prometheus": "prometheus", "--issue-file": "issueFile", "--pack": "pack", "--config": "config", "--targets-file": "targetsFile" };
  const flags = { "--json": "json", "--pretty": "pretty", "--issue-url": "issueUrl", "--copy-issue": "copyIssue", "--fail-on-degraded": "failOnDegraded", "--verbose": "verbose" };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("-")) { positionals.push(token); continue; }
    if (token === "--no-http") { options.http = false; explicit.add("http"); continue; }
    if (Object.hasOwn(flags, token)) { options[flags[token]] = true; explicit.add(flags[token]); continue; }
    const key = valueOptions[token];
    if (!key) throw usageError("unknown option; use help");
    const value = argv[++i];
    if (!value || value.startsWith("-") || /[\u0000-\u001f\u007f]/.test(value)) throw usageError(`${token} requires a valid value`);
    if (key === "dnsCompareServers") options[key].push(value);
    else {
      if (explicit.has(key)) throw usageError(`${token} was specified more than once`);
      options[key] = value;
    }
    explicit.add(key);
  }
  if (positionals.length > 1) throw usageError("check accepts exactly one target, a pack, a targets file, or config");
  if ([positionals.length > 0, Boolean(options.pack), Boolean(options.targetsFile)].filter(Boolean).length > 1) throw usageError("select only one target source");
  if (!positionals.length && !options.pack && !options.targetsFile && !options.config && command === "check") throw usageError("check requires a target or target source");
  options.target = positionals[0] || null;
  if (options.target) explicit.add("target");
  options.explicit = [...explicit];
  return validateOptions(options);
}

export function validateOptions(options) {
  options.timeoutMs = integer(options.timeoutMs, 250, 60000, "timeoutMs");
  options.concurrency = integer(options.concurrency, 1, 4, "concurrency");
  options.maxRedirects = integer(options.maxRedirects, 0, 5, "maxRedirects");
  options.maxBodyBytes = integer(options.maxBodyBytes, 1024, 65536, "maxBodyBytes");
  if (typeof options.country !== "string" || !/^[A-Za-z]{2}$/.test(options.country)) throw usageError("country requires two letters (ZZ means unknown)");
  options.country = options.country.toUpperCase();
  for (const key of ["region", "provider"]) if (typeof options[key] !== "string" || !options[key].trim() || options[key].length > 80 || /[\u0000-\u001f\u007f]/.test(options[key])) throw usageError(`${key} must be a coarse label of 1..80 characters`);
  if (!CONNECTION_TYPES.has(options.connectionType)) throw usageError("invalid connection type");
  try { options.asn = parseAsn(options.asn); } catch { throw usageError("asn must be an integer between 1 and 4294967295"); }
  if (options.dnsServer !== null && !net.isIP(options.dnsServer)) throw usageError("dnsServer requires a resolver IP");
  if (!Array.isArray(options.dnsCompareServers) || options.dnsCompareServers.some(server => typeof server !== "string" || !net.isIP(server))) throw usageError("comparison resolvers require IP addresses");
  options.dnsCompareServers = [...new Set(options.dnsCompareServers)];
  if (options.dnsCompareServers.length > 3) throw usageError("at most three comparison resolvers are supported");
  if (options.pack) options.pack = options.pack.toLowerCase();
  if (options.command === "preflight" && options.http === false) throw usageError("preflight requires HTTP; use check --no-http for transport-only diagnostics");
  const paths = ["output", "issueFile", "junit", "prometheus"].filter(key => options[key]).map(key => path.resolve(options[key]));
  const inputPaths = [options.config, options.targetsFile].filter(Boolean).map(value => path.resolve(value));
  if (new Set(paths).size !== paths.length || paths.some(file => inputPaths.includes(file))) throw usageError("input and output file paths must be distinct");
  return options;
}

export function parseSampleArgs(argv) {
  if (argv.some(token => token !== "--pretty")) throw usageError("sample only accepts --pretty");
  return { command: "sample", pretty: argv.includes("--pretty") };
}

function integer(value, min, max, label) {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) throw usageError(`${label} must be an integer`);
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw usageError(`${label} must be an integer between ${min} and ${max}`);
  return number;
}
