import dns from "node:dns";
import net from "node:net";
import { isPublicAddress } from "../../../src/target-policy.js";
import { elapsedMs, errorMessage, statusFromNetworkError, withTimeout, throwIfAborted } from "./util.js";

/** Internal addresses are deliberately non-enumerable and never enter JSON reports. */
export async function checkDns(target, options = {}) {
  throwIfAborted(options.signal);
  const startedAt = performance.now();
  if (net.isIP(target)) return dnsResult([{ address: target, family: net.isIP(target) }], "literal", startedAt);
  if (options.dnsServer) return checkExplicitDns(target, options, startedAt);
  const lookup = options.lookup || (name => dns.promises.lookup(name, { all: true, order: "ipv4first" }));
  try {
    const addresses = await withTimeout(lookup(target), options.timeoutMs ?? 5000, undefined, options.signal);
    return dnsResult(Array.isArray(addresses) ? addresses : [addresses], "system", startedAt);
  } catch (error) {
    if (error.code === "ABORT_ERR") throw error;
    return dnsError(error, "system", startedAt);
  }
}

async function checkExplicitDns(target, options, startedAt) {
  const resolver = options.resolverFactory ? options.resolverFactory() : new dns.promises.Resolver({ timeout: options.timeoutMs ?? 5000, tries: 1 });
  try {
    resolver.setServers([options.dnsServer]);
    const answers = await withTimeout(Promise.allSettled([resolver.resolve4(target), resolver.resolve6(target)]), options.timeoutMs ?? 5000, () => resolver.cancel(), options.signal);
    const addresses = answers.flatMap((answer, i) => answer.status === "fulfilled" ? answer.value.map(address => ({ address, family: i === 0 ? 4 : 6 })) : []);
    if (!addresses.length) {
      const reason = answers.find(answer => answer.status === "rejected")?.reason || Object.assign(new Error("no addresses"), { code: "ENODATA" });
      return dnsError(reason, "explicit", startedAt);
    }
    return dnsResult(addresses, "explicit", startedAt);
  } catch (error) {
    if (error.code === "ABORT_ERR") throw error;
    return dnsError(error, "explicit", startedAt);
  } finally {
    resolver.cancel();
  }
}

export async function checkDnsComparison(target, options = {}) {
  const servers = [...new Set(options.dnsCompareServers || [])].slice(0, 3);
  if (!servers.length) return null;
  const startedAt = performance.now();
  if (net.isIP(target)) return { status: "skipped", latency_ms: elapsedMs(startedAt), resolvers: [] };
  const resolvers = await Promise.all(servers.map(async (server, index) => {
    throwIfAborted(options.signal);
    let result;
    try {
      result = options.resolveWithServer
        ? await withTimeout(options.resolveWithServer(target, server, options), options.timeoutMs ?? 5000, undefined, options.signal)
        : await checkExplicitDns(target, { ...options, dnsServer: server }, performance.now());
    } catch (error) {
      if (error.code === "ABORT_ERR") throw error;
      result = dnsError(error, "explicit", startedAt);
    }
    return { resolver: `comparison-${index + 1}`, status: result.status, addresses_count: result.addresses_count ?? 0, latency_ms: Math.round(result.latency_ms || 0) };
  }));
  return { status: resolvers.some(item => item.status === "ok") ? "ok" : resolvers[0].status, latency_ms: elapsedMs(startedAt), resolvers };
}

function dnsResult(entries, resolver, startedAt) {
  const seen = new Set();
  const addresses = entries.filter(entry => {
    if (!entry || !net.isIP(entry.address) || seen.has(entry.address)) return false;
    seen.add(entry.address);
    return true;
  }).map(entry => ({ address: entry.address, family: net.isIP(entry.address) }));
  const unsafe = addresses.some(entry => !isPublicAddress(entry.address));
  const result = {
    status: !addresses.length ? "error" : unsafe ? "suspicious_answer" : "ok",
    latency_ms: elapsedMs(startedAt), addresses_count: addresses.length, resolver
  };
  if (unsafe) result.error = "ERR_UNSAFE_ADDRESS";
  // Reject the entire answer set if ANY record is unsafe, not just the selected record.
  Object.defineProperty(result, "addresses", { value: unsafe ? [] : addresses, enumerable: false });
  return result;
}

function dnsError(error, resolver, startedAt) {
  const status = error?.code === "ECONNREFUSED" ? "refused" : statusFromNetworkError(error);
  return { status, latency_ms: elapsedMs(startedAt), addresses_count: 0, resolver, error: errorMessage(error) };
}
