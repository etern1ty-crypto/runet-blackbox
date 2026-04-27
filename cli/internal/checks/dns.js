import dns from "node:dns";
import net from "node:net";
import { elapsedMs, errorMessage, statusFromNetworkError, withTimeout } from "./util.js";

export async function checkDns(target, options = {}) {
  const startedAt = performance.now();
  if (net.isIP(target)) {
    return { status: "ok", latency_ms: elapsedMs(startedAt), addresses_count: 1, resolver: "literal" };
  }

  const resolver = new dns.promises.Resolver();
  if (options.dnsServer) {
    resolver.setServers([options.dnsServer]);
  }

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
      resolver: options.dnsServer || "system"
    };
  } catch (error) {
    return { status: statusFromNetworkError(error), latency_ms: elapsedMs(startedAt), addresses_count: 0, error: errorMessage(error) };
  }
}

function countFulfilled(result) {
  return result.status === "fulfilled" ? result.value.length : 0;
}

function statusFromDnsError(error) {
  if (error?.code === "ENOTFOUND") return "nxdomain";
  if (error?.code === "ESERVFAIL") return "servfail";
  if (error?.code === "EREFUSED") return "refused";
  if (error?.code === "ETIMEOUT" || error?.code === "ETIMEDOUT") return "timeout";
  return "error";
}
