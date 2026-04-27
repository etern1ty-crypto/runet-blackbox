import { diagnosisMetadata } from "../../src/diagnosis-metadata.js";

export function formatHumanReport(report, options = {}) {
  const metadata = diagnosisMetadata(report.diagnosis.category);
  const lines = [];
  lines.push("Runet Blackbox measurement");
  lines.push("");
  lines.push(`Target:     ${report.target}`);
  lines.push(`Report ID:  ${report.report_id}`);
  lines.push(`Location:   ${report.country}/${report.region}`);
  lines.push(`Network:    ${report.network.provider}${report.network.asn ? ` AS${report.network.asn}` : ""} (${report.network.connection_type})`);
  lines.push(`Diagnosis:  ${metadata.title} [${report.diagnosis.category}]`);
  lines.push(`Confidence: ${Math.round(report.diagnosis.confidence * 100)}%`);
  lines.push(`Summary:    ${metadata.summary}`);
  lines.push(`Next step:  ${metadata.next_step}`);
  lines.push("");
  lines.push("Checks:");
  for (const [name, result] of Object.entries(report.results)) {
    const latency = Number.isFinite(result.latency_ms) ? ` ${Math.round(result.latency_ms)}ms` : "";
    const detail = result.error ? ` - ${result.error}` : "";
    lines.push(`  ${name.padEnd(8)} ${result.status}${latency}${detail}`);
  }
  if (report.diagnosis.signals.length) {
    lines.push("");
    lines.push("Signals:");
    for (const signal of report.diagnosis.signals) {
      lines.push(`  - ${signal}`);
    }
  }
  lines.push("");
  lines.push("Privacy:");
  lines.push("  Public reports exclude user IPs, raw DNS answers, headers, cookies, bodies, packet captures, and exact location.");
  if (options.output) {
    lines.push("");
    lines.push(`JSON report written to ${options.output}`);
  }
  return `${lines.join("\n")}\n`;
}

export function helpText() {
  return `Runet Blackbox v0.1.0
Open network observability for unstable networks.

Usage:
  runet-blackbox check <domain> [options]
  runet-blackbox sample [--pretty]
  runet-blackbox version

Examples:
  runet-blackbox check github.com --region Moscow --provider Rostelecom
  runet-blackbox check github.com --region Moscow --provider MTS --connection-type mobile --json --pretty
  runet-blackbox check example.com --no-http --fail-on-degraded
  runet-blackbox sample --pretty

Options:
  --country <code>           ISO country code, default RU
  --region <name>            Coarse region label, default unknown
  --provider <name>          ISP/provider label, default unknown
  --asn <number|ASnumber>    Network ASN
  --connection-type <type>   unknown, home, mobile, office, public_wifi, hosting, other
  --timeout <ms>             Probe timeout, 250..60000, default 5000
  --dns-server <ip>          Optional resolver for DNS probe
  --no-http                  Skip HTTP/HTTPS request after TLS
  --json                     Print JSON report
  --pretty                   Pretty-print JSON
  --fail-on-degraded         Exit 2 when diagnosis category is not ok
  -o, --output <file>        Write JSON report to file

Exit codes:
  0  Measurement completed
  2  Measurement completed and --fail-on-degraded found degradation
  64 Command-line usage error
  70 Internal error
`;
}
