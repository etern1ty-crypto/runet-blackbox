export function formatHumanReport(report) {
  const lines = [];
  lines.push(`Target: ${report.target}`);
  lines.push(`Location: ${report.country}/${report.region}`);
  lines.push(`Network: ${report.network.provider}${report.network.asn ? ` AS${report.network.asn}` : ""}`);
  lines.push(`Diagnosis: ${report.diagnosis.category} (${Math.round(report.diagnosis.confidence * 100)}%)`);
  lines.push("");
  lines.push("Checks:");
  for (const [name, result] of Object.entries(report.results)) {
    const latency = Number.isFinite(result.latency_ms) ? ` ${Math.round(result.latency_ms)}ms` : "";
    const detail = result.error ? ` - ${result.error}` : "";
    lines.push(`  ${name}: ${result.status}${latency}${detail}`);
  }
  if (report.diagnosis.signals.length) {
    lines.push("");
    lines.push("Signals:");
    for (const signal of report.diagnosis.signals) {
      lines.push(`  - ${signal}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function helpText() {
  return `Runet Blackbox ${"\n"}
Usage:
  runet-blackbox check <domain> [options]
  runet-blackbox version

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
  -o, --output <file>        Write JSON report to file
`;
}
