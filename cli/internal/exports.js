const xml = value => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const label = value => String(value).replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll('"', '\\"');
const reportsOf = payload => Array.isArray(payload.reports) ? payload.reports : [payload];

export function buildJUnit(payload) {
  const reports = reportsOf(payload);
  const failures = reports.filter(report => report.diagnosis.category !== "ok").length;
  const cases = reports.map(report => {
    const failure = report.diagnosis.category !== "ok" ? `\n      <failure type="${xml(report.diagnosis.category)}" message="${xml(report.diagnosis.category)}">${xml(report.diagnosis.signals.join("; "))}</failure>` : "";
    return `    <testcase classname="runet-blackbox.preflight" name="${xml(report.target)}">${failure}\n      <system-out>${xml(JSON.stringify(report))}</system-out>\n    </testcase>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites tests="${reports.length}" failures="${failures}">\n  <testsuite name="Public dependency preflight" tests="${reports.length}" failures="${failures}" errors="0">\n${cases.join("\n")}\n  </testsuite>\n</testsuites>\n`;
}

export function buildPrometheus(payload) {
  const reports = reportsOf(payload);
  const lines = ["# HELP runet_blackbox_success Whether the configured checks passed (1=yes, 0=no).", "# TYPE runet_blackbox_success gauge"];
  for (const report of reports) lines.push(`runet_blackbox_success{target="${label(report.target)}"} ${Number(report.diagnosis.category === "ok")}`);
  lines.push("# HELP runet_blackbox_probe_duration_seconds Duration of each probe; not additive.", "# TYPE runet_blackbox_probe_duration_seconds gauge");
  for (const report of reports) for (const [probe, result] of Object.entries(report.results)) if (Number.isFinite(result.latency_ms)) lines.push(`runet_blackbox_probe_duration_seconds{target="${label(report.target)}",probe="${label(probe)}"} ${result.latency_ms / 1000}`);
  lines.push("# HELP runet_blackbox_report_timestamp_seconds Privacy-rounded measurement timestamp; alert on staleness.", "# TYPE runet_blackbox_report_timestamp_seconds gauge");
  for (const report of reports) lines.push(`runet_blackbox_report_timestamp_seconds{target="${label(report.target)}"} ${Date.parse(report.timestamp_utc) / 1000}`);
  return lines.join("\n") + "\n";
}
