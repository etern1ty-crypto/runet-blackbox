const WIDTH = 1200;
const HEIGHT = 630;

export function buildOverviewShareCard(aggregate, options = {}) {
  const generatedAt = options.generatedAt || aggregate.generated_at || new Date().toISOString();
  const title = "Runet Blackbox";
  const subtitle = "Network Weather";
  const status = aggregate.status || "no_data";
  const rows = [
    ["reports", aggregate.total_reports || 0],
    ["targets", aggregate.total_targets || 0],
    ["incident candidates", aggregate.weather?.incident_candidates || 0],
    ["reports needed", aggregate.weather?.reports_needed || 0]
  ];
  return renderCard({
    title,
    subtitle,
    status,
    badge: statusLabel(status),
    accent: colorForStatus(status),
    rows,
    note: aggregate.dataset_quality?.note_ru || aggregate.dataset_quality?.note || "Privacy-first public network diagnostics.",
    generatedAt
  });
}

export function buildTargetShareCard(domain, aggregate = {}, options = {}) {
  const generatedAt = options.generatedAt || aggregate.generated_at || new Date().toISOString();
  const status = domain.weather?.status || domain.status || "no_data";
  const rows = [
    ["reports", domain.total || 0],
    ["degraded", `${Math.round((domain.degraded_ratio || 0) * 100)}%`],
    ["top diagnosis", domain.dominant_category?.title_ru || domain.dominant_category?.category || "unknown"],
    ["credibility", domain.credibility?.label_ru || domain.credibility?.label || "unknown"]
  ];
  return renderCard({
    title: domain.key || "unknown target",
    subtitle: "Runet Blackbox target card",
    status,
    badge: domain.weather?.label_ru || statusLabel(status),
    accent: colorForStatus(status),
    rows,
    note: domain.weather?.note_ru || "Community reports are triage signals, not proof by themselves.",
    generatedAt
  });
}

function renderCard({ title, subtitle, status, badge, accent, rows, note, generatedAt }) {
  const safeRows = rows.slice(0, 4);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${xml(`${title} ${badge}`)}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#fff7e4"/>
      <stop offset="54%" stop-color="#f1eadb"/>
      <stop offset="100%" stop-color="#dfe9e6"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#2b2214" flood-opacity="0.22"/>
    </filter>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="112" cy="96" r="210" fill="#b53d1f" opacity="0.16"/>
  <circle cx="1078" cy="98" r="250" fill="#0d5c63" opacity="0.16"/>
  <rect x="70" y="66" width="1060" height="498" rx="42" fill="#fffdf4" opacity="0.88" filter="url(#shadow)"/>
  <text x="108" y="132" fill="#b53d1f" font-family="Bahnschrift, Segoe UI, sans-serif" font-size="25" font-weight="800" letter-spacing="4">${xml(subtitle.toUpperCase())}</text>
  <text x="108" y="222" fill="#171612" font-family="Georgia, serif" font-size="${title.length > 32 ? 62 : 78}" font-weight="800">${xml(title)}</text>
  <rect x="108" y="262" width="${Math.max(210, badge.length * 15)}" height="52" rx="26" fill="${accent}"/>
  <text x="132" y="297" fill="${status === "weak_signal" || status === "reports_needed" ? "#20150a" : "#fffaf0"}" font-family="Bahnschrift, Segoe UI, sans-serif" font-size="24" font-weight="900">${xml(badge.toUpperCase())}</text>
  ${safeRows.map((row, index) => metric(row[0], row[1], 108 + index * 258, 374)).join("\n  ")}
  <text x="108" y="498" fill="#4b463d" font-family="Bahnschrift, Segoe UI, sans-serif" font-size="23" font-weight="700">${xml(truncate(note, 94))}</text>
  <text x="108" y="532" fill="#6b665b" font-family="Bahnschrift, Segoe UI, sans-serif" font-size="18" font-weight="700">No IPs, headers, cookies, bodies, packet captures, or exact location. Generated ${xml(generatedAt.slice(0, 10))} UTC.</text>
</svg>
`;
}

function metric(label, value, x, y) {
  return `<g>
    <text x="${x}" y="${y}" fill="#6b665b" font-family="Bahnschrift, Segoe UI, sans-serif" font-size="20" font-weight="800" letter-spacing="2">${xml(String(label).toUpperCase())}</text>
    <text x="${x}" y="${y + 58}" fill="#171612" font-family="Georgia, serif" font-size="52" font-weight="800">${xml(String(value))}</text>
  </g>`;
}

function colorForStatus(status) {
  if (status === "mostly_ok" || status === "ok") return "#1f8f55";
  if (status === "reports_needed" || status === "weak_signal") return "#f0bd55";
  if (status === "no_data" || status === "unknown") return "#65717b";
  return "#c43d2b";
}

function statusLabel(status) {
  if (status === "mostly_ok" || status === "ok") return "Mostly OK";
  if (status === "reports_needed") return "Reports needed";
  if (status === "weak_signal") return "Weak signal";
  if (status === "no_data") return "No data";
  return "Degraded";
}

function truncate(value, max) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function xml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
