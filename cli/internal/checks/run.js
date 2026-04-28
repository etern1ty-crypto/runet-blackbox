import { buildReport } from "../../../src/report.js";
import { assertMeasurementTarget } from "../../../src/target-policy.js";
import { checkDns } from "./dns.js";
import { checkHttp } from "./http.js";
import { checkTcp } from "./tcp.js";
import { checkTls } from "./tls.js";

export async function runCheck(targetInput, options = {}) {
  const target = assertMeasurementTarget(targetInput);
  const results = {};

  results.dns = await checkDns(target, options);

  if (results.dns.status !== "ok") {
    results.tcp_80 = { status: "not_tested_due_to_dns_failure" };
    results.tcp_443 = { status: "not_tested_due_to_dns_failure" };
    results.tls = { status: "not_tested_due_to_dns_failure" };
    results.http = { status: "not_tested_due_to_dns_failure" };
  } else {
    const [tcp80, tcp443] = await Promise.all([
      checkTcp(target, 80, options),
      checkTcp(target, 443, options)
    ]);
    results.tcp_80 = tcp80;
    results.tcp_443 = tcp443;

    if (tcp443.status === "ok") {
      results.tls = await checkTls(target, options);
      if (options.http !== false && results.tls.status === "ok") {
        results.http = await checkHttp(target, options);
      } else {
        results.http = { status: options.http === false ? "skipped" : "not_tested_due_to_tls_failure" };
      }
    } else {
      results.tls = { status: "not_tested_due_to_tcp_failure" };
      results.http = { status: "not_tested_due_to_tcp_failure" };
    }
  }

  return buildReport({
    target,
    country: options.country,
    region: options.region,
    provider: options.provider,
    asn: options.asn,
    connectionType: options.connectionType,
    environment: options.environment,
    results
  });
}
