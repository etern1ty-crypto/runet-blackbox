const WIDTH = 1200;
const HEIGHT = 630;

export function buildOverviewShareCard(aggregate, options = {}) {
  return render({
    title: "Runet Blackbox", subtitle: aggregate.demo ? "SYNTHETIC DEMO · NOT LIVE DATA" : "PUBLIC DEPENDENCY PREFLIGHT",
    status: aggregate.status || "no_data", badge: statusLabel(aggregate.status),
    metrics: [["Measurements", aggregate.total_reports || 0], ["Targets", aggregate.total_targets || 0], ["Incident candidates", aggregate.weather?.incident_candidates || 0], ["Window", `${aggregate.window_hours ?? 24} h`]],
    note: aggregate.demo ? "Synthetic examples for interface review. Not evidence of service availability." : "One network, one moment. Counts do not prove independent sources or an SLA.",
    generatedAt: options.generatedAt || aggregate.generated_at || new Date().toISOString()
  });
}

export function buildTargetShareCard(domain, aggregate = {}, options = {}) {
  return render({
    title: domain.key || "Unknown target", subtitle: aggregate.demo ? "SYNTHETIC DEMO · NOT LIVE DATA" : "RUNET BLACKBOX · TARGET EVIDENCE",
    status: domain.weather?.status || domain.status, badge: domain.weather?.label || domain.weather?.label_ru || statusLabel(domain.status),
    metrics: [["Measurements", domain.total || 0], ["Degraded share", `${Math.round((domain.degraded_ratio || 0) * 100)}%`], ["Top signal", domain.dominant_category?.title || domain.dominant_category?.title_ru || "Unknown"], ["Sample volume", domain.credibility?.label || domain.credibility?.label_ru || "Unknown"]],
    note: domain.weather?.note || domain.weather?.note_ru || "A local triage signal, not proof of a global incident.",
    generatedAt: options.generatedAt || aggregate.generated_at || new Date().toISOString()
  });
}

function render({ title, subtitle, status, badge, metrics, note, generatedAt }) {
  const good = ["ok", "mostly_ok"].includes(status);
  const uncertain = ["no_data", "unknown", "weak_signal", "reports_needed"].includes(status);
  const accent = good ? "#287849" : uncertain ? "#605e5a" : "#aa3228";
  const titleLines = wrap(title, 48, 2);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${xml(title + ': ' + badge)}">
  <rect width="1200" height="630" fill="#ffffff"/>
  <rect x="0" y="0" width="1200" height="8" fill="#1763ad"/>
  <text x="64" y="67" fill="#1763ad" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2">${xml(subtitle)}</text>
  ${titleLines.map((line, i) => `<text x="64" y="${134 + i * 48}" fill="#2c2c2b" font-family="Arial, sans-serif" font-size="42" font-weight="700" ${line.length > 24 ? 'textLength="1072" lengthAdjust="spacingAndGlyphs"' : ""}>${xml(line)}</text>`).join("\n  ")}
  <text x="64" y="235" fill="${accent}" font-family="Arial, sans-serif" font-size="23" font-weight="700">${xml(truncate(badge, 68))}</text>
  ${metrics.map(([label, value], i) => metric(label, value, 64 + i * 274)).join("\n  ")}
  ${wrap(note, 91, 2).map((line, i) => `<text x="64" y="${490 + i * 28}" fill="#605e5a" font-family="Arial, sans-serif" font-size="20">${xml(line)}</text>`).join("\n  ")}
  <line x1="64" x2="1136" y1="552" y2="552" stroke="#dedddb"/>
  <text x="64" y="590" fill="#605e5a" font-family="Arial, sans-serif" font-size="17">No raw DNS answers, headers, cookies or response bodies.</text>
  <text x="1136" y="590" text-anchor="end" fill="#605e5a" font-family="Arial, sans-serif" font-size="17">${xml(String(generatedAt).slice(0, 10))} UTC</text>
</svg>
`;
}

function metric(label, value, x) {
  const text = String(value);
  const numeric = typeof value === "number" || /^\d+(?:%| h)?$/.test(text);
  const lines = wrap(text, 18, 3);
  return `<g><rect x="${x}" y="276" width="250" height="160" rx="8" fill="#f9f8f7"/>
    <text x="${x + 18}" y="309" fill="#605e5a" font-family="Arial, sans-serif" font-size="16">${xml(label)}</text>
    ${lines.map((line, i) => `<text x="${x + 18}" y="${numeric ? 381 : 351 + i * 29}" fill="#2c2c2b" font-family="Arial, sans-serif" font-size="${numeric ? 48 : 23}" font-weight="700">${xml(line)}</text>`).join("\n")}</g>`;
}

function statusLabel(status) {
  if (["ok", "mostly_ok"].includes(status)) return "Mostly OK";
  if (["no_data", undefined].includes(status)) return "No data";
  if (status === "unknown") return "Inconclusive";
  return "Needs investigation";
}
function wrap(value, limit, maxLines) {
  const words = String(value || "").replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let line = "";
  for (let word of words) {
    if (word.length > limit) word = truncate(word, limit);
    if (line && line.length + word.length + 1 > limit) { lines.push(line); line = ""; }
    line += (line ? " " : "") + word;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines[maxLines - 1] = truncate(lines.slice(maxLines - 1).join(" "), limit); lines.length = maxLines; }
  return lines;
}
function truncate(value, max) { const text = String(value || ""); return text.length > max ? text.slice(0, max - 1) + "…" : text; }
function xml(value) { return String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;"); }
