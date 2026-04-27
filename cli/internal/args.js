import { parseAsn } from "../../src/target.js";

export function parseCliArgs(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    return { command: "help" };
  }
  if (command === "version" || command === "--version" || command === "-v") {
    return { command: "version" };
  }
  if (command !== "check") {
    throw new Error(`unknown command: ${command}`);
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
    http: true,
    dnsServer: null
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
      case "--dns-server":
        options.dnsServer = requiredValue(argv, ++i, token);
        break;
      case "--output":
      case "-o":
        options.output = requiredValue(argv, ++i, token);
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
      default:
        throw new Error(`unknown option: ${token}`);
    }
  }

  if (positionals.length !== 1) {
    throw new Error("check requires exactly one target");
  }

  options.target = positionals[0];
  return options;
}

function requiredValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("-")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function parseTimeout(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 250 || number > 60000) {
    throw new Error("--timeout must be an integer between 250 and 60000 milliseconds");
  }
  return number;
}
