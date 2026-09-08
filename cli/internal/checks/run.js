import { buildReport } from "../../../src/report.js";
import { assertRootTarget } from "../../../src/target-policy.js";
import { checkDns, checkDnsComparison } from "./dns.js";
import { checkHttp } from "./http.js";
import { checkTcp } from "./tcp.js";
import { checkTls } from "./tls.js";
import { throwIfAborted } from "./util.js";

export async function runCheck(targetInput, options = {}) {
  const target = assertRootTarget(targetInput);
  throwIfAborted(options.signal);
  const results = {};
  results.dns = await checkDns(target, options);
  const comparison = await checkDnsComparison(target, options);
  if (comparison) results.dns_compare = comparison;
  if (results.dns.status !== "ok") {
    for (const name of ["tcp_80", "tcp_443", "tls", "http"]) results[name] = { status: "not_tested_due_to_dns_failure" };
  } else {
    // One deterministic address across all phases; comparisons never change the path.
    const address = results.dns.addresses[0];
    const probeOptions = { ...options, address: address.address };
    const [tcp80, tcp443] = await Promise.all([checkTcp(target, 80, probeOptions), checkTcp(target, 443, probeOptions)]);
    results.tcp_80 = tcp80;
    results.tcp_443 = tcp443;
    if (tcp443.status === "ok") {
      results.tls = await checkTls(target, probeOptions);
      results.http = options.http === false ? { status: "skipped" }
        : results.tls.status === "ok" ? await checkHttp(target, probeOptions)
        : { status: "not_tested_due_to_tls_failure" };
    } else {
      results.tls = { status: "not_tested_due_to_tcp_failure" };
      results.http = { status: "not_tested_due_to_tcp_failure" };
    }
  }
  throwIfAborted(options.signal);
  return buildReport({ target, country: options.country, region: options.region, provider: options.provider, asn: options.asn, connectionType: options.connectionType, environment: options.environment, results });
}
