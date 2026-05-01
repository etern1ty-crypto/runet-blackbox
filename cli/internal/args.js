import { parseAsn } from "../../src/target.js";

export function parseCliArgs(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    return { command: "help" };
  }
  if (command === "version" || command === "--version" || command === "-v") {
    return { command: "version" };
  }
  if (command === "sample") {
    return parseSampleArgs(rest);
  }
  if (command === "packs") {
    return { command: "packs" };
  }
  if (command === "doctor") {
    return { command: "doctor" };
  }
  if (command !== "check") {
    throw usageError(`unknown command: ${command}`);
  }
  return parseCheckArgs(rest);
}

export function parseCheckArgs(argv) {
  const options = {
    command: "check",
    country: "RU",
    region: "unknown",
    provider: "unknown",
    asn: null,
    connectionType: "unknown",
    timeoutMs: 5000,
    json: false,
    pretty: false,
    output: null,
    issueFile: null,
    issueUrl: false,
    copyIssue: false,
    pack: null,
    http: true,
    dnsServer: null,
    failOnDegraded: false
  };

  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("-")) {
      positionals.push(token);
      continue;
    }

    switch (token) {
      case "--country":
        options.country = requiredValue(argv, ++i, token);
        break;
      case "--region":
        options.region = requiredValue(argv, ++i, token);
        break;
      case "--provider":
        options.provider = requiredValue(argv, ++i, token);
        break;
      case "--asn":
        options.asn = parseAsn(requiredValue(argv, ++i, token));
        break;
      case "--connection-type":
        options.connectionType = requiredValue(argv, ++i, token);
        break;
      case "--timeout":
        options.timeoutMs = parseTimeout(requiredValue(argv, ++i, token));
        break;
      case "--dns":
      case "--dns-server":
        options.dnsServer = requiredValue(argv, ++i, token);
        break;
      case "--output":
      case "-o":
        options.output = requiredValue(argv, ++i, token);
        break;
      case "--issue-file":
        options.issueFile = requiredValue(argv, ++i, token);
        break;
      case "--issue-url":
        options.issueUrl = true;
        break;
      case "--copy-issue":
        options.copyIssue = true;
        break;
      case "--pack":
        options.pack = requiredValue(argv, ++i, token).toLowerCase();
        break;
      case "--json":
        options.json = true;
        break;
      case "--pretty":
        options.pretty = true;
        break;
      case "--no-http":
        options.http = false;
        break;
      case "--fail-on-degraded":
        options.failOnDegraded = true;
        break;
      default:
        throw usageError(`unknown option: ${token}`);
    }
  }

  if (options.pack && positionals.length > 0) {
    throw usageError("check accepts either <target> or --pack, not both");
  }
  if (!options.pack && positionals.length !== 1) {
    throw usageError("check requires exactly one target or --pack <name>");
  }

  options.target = positionals[0] || null;
  return options;
}

export function parseSampleArgs(argv) {
  const options = { command: "sample", pretty: false };
  for (const token of argv) {
    if (token === "--pretty") {
      options.pretty = true;
    } else {
      throw usageError(`unknown option: ${token}`);
    }
  }
  return options;
}

function requiredValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("-")) {
    throw usageError(`${option} requires a value`);
  }
  return value;
}

function parseTimeout(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 250 || number > 60000) {
    throw usageError("--timeout must be an integer between 250 and 60000 milliseconds");
  }
  return number;
}

function usageError(message) {
  const error = new Error(message);
  error.exitCode = 64;
  return error;
}
