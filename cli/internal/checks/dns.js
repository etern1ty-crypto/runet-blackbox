import dns from "node:dns";
import net from "node:net";
import { elapsedMs, errorMessage, statusFromNetworkError, withTimeout } from "./util.js";

export async function checkDns(target, options = {}) {
  const startedAt = performance.now();
  if (net.isIP(target)) {
    return { status: "ok", latency_ms: elapsedMs(startedAt), addresses_count: 1, resolver: "literal" };
  }

  if (!options.dnsServer) {
    return checkSystemDns(target, options, startedAt);
  }

  return checkExplicitDns(target, options, startedAt);
}

async function checkSystemDns(target, options, startedAt) {
  const lookup = options.lookup || lookupAll;
  try {
    const addresses = await withTimeout(lookup(target), options.timeoutMs || 5000);
    const addressesCount = countLookupAddresses(addresses);
    return {
      status: addressesCount > 0 ? "ok" : "error",
      latency_ms: elapsedMs(startedAt),
      addresses_count: addressesCount,
      resolver: "system"
    };
  } catch (error) {
    return { status: statusFromDnsError(error), latency_ms: elapsedMs(startedAt), addresses_count: 0, error: errorMessage(error), resolver: "system" };
  }
}

async function checkExplicitDns(target, options, startedAt) {
  const resolver = new dns.promises.Resolver();
  resolver.setServers([options.dnsServer]);

  try {
    const [a, aaaa] = await withTimeout(
      Promise.allSettled([resolver.resolve4(target), resolver.resolve6(target)]),
      options.timeoutMs || 5000
    );
    const addressesCount = countFulfilled(a) + countFulfilled(aaaa);
    if (a.status === "rejected" && a.reason?.code === "ENOTFOUND" && aaaa.status === "rejected" && aaaa.reason?.code === "ENOTFOUND") {
      return { status: "nxdomain", latency_ms: elapsedMs(startedAt), addresses_count: 0 };
    }
    if (addressesCount === 0 && (a.status === "rejected" || aaaa.status === "rejected")) {
      const reason = a.reason || aaaa.reason;
      return { status: statusFromDnsError(reason), latency_ms: elapsedMs(startedAt), addresses_count: 0, error: errorMessage(reason) };
    }
    return {
      status: "ok",
      latency_ms: elapsedMs(startedAt),
      addresses_count: addressesCount,
      resolver: options.dnsServer
    };
  } catch (error) {
    return { status: statusFromNetworkError(error), latency_ms: elapsedMs(startedAt), addresses_count: 0, error: errorMessage(error), resolver: options.dnsServer };
  }
}

function lookupAll(target) {
  return dns.promises.lookup(target, { all: true, verbatim: false });
}

function countLookupAddresses(addresses) {
  return (Array.isArray(addresses) ? addresses : [addresses]).filter((address) => net.isIP(address?.address)).length;
}

function countFulfilled(result) {
  return result.status === "fulfilled" ? result.value.length : 0;
}

function statusFromDnsError(error) {
  if (error?.code === "ENOTFOUND") return "nxdomain";
  if (error?.code === "ESERVFAIL") return "servfail";
  if (error?.code === "EREFUSED" || error?.code === "ECONNREFUSED") return "refused";
  if (error?.code === "ETIMEOUT" || error?.code === "ETIMEDOUT" || error?.code === "EAI_AGAIN") return "timeout";
  return "error";
}
