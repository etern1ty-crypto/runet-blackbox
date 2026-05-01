export function buildWeeklyDigest(aggregate, options = {}) {
  const generatedAt = new Date(options.generatedAt || aggregate.generated_at || Date.now());
  const week = isoWeekLabel(generatedAt);
  const domains = aggregate.domains || [];
  const incidentCandidates = aggregate.incident_candidates || [];
  const reportsNeeded = domains.filter((domain) => domain.weather?.status === "reports_needed");
  const topTargets = domains.slice().sort((a, b) => b.total - a.total).slice(0, 10);

  const lines = [];
  lines.push(`# Runet Blackbox Network Weather ${week}`);
  lines.push("");
  lines.push("> Открытая диагностика нестабильных сетей. Это не VPN, не proxy и не bypass guide.");
  lines.push("> Open network observability for unstable networks. Community reports are triage signals, not proof by themselves.");
  lines.push("");
  lines.push(`Generated at: ${generatedAt.toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Reports: ${aggregate.total_reports || 0}`);
  lines.push(`- Targets: ${aggregate.total_targets || 0}`);
  lines.push(`- Dataset quality: ${aggregate.dataset_quality?.label_ru || aggregate.dataset_quality?.label || "unknown"}`);
  lines.push(`- Incident candidates: ${aggregate.weather?.incident_candidates || 0}`);
  lines.push(`- Degraded candidates: ${aggregate.weather?.degraded_candidates || 0}`);
  lines.push(`- Reports needed: ${aggregate.weather?.reports_needed || 0}`);
  lines.push("");
  lines.push("## Incident Candidates");
  lines.push("");
  if (incidentCandidates.length) {
    lines.push("| Target | Reports | Degraded | Dominant diagnosis | Credibility |");
    lines.push("| --- | ---: | ---: | --- | --- |");
    for (const domain of incidentCandidates.slice(0, 10)) {
      lines.push(`| ${cell(domain.key)} | ${domain.total} | ${percent(domain.degraded_ratio)} | ${cell(domain.dominant_category?.title_ru || domain.dominant_category?.category)} | ${cell(domain.credibility?.label_ru || domain.credibility?.label)} |`);
    }
  } else {
    lines.push("No incident candidates in the current public dataset.");
  }
  lines.push("");
  lines.push("## Targets Needing Reports");
  lines.push("");
  if (reportsNeeded.length) {
    lines.push(reportsNeeded.slice(0, 12).map((domain) => `- \`${domain.key}\` - ${domain.weather?.note_ru || "нужны независимые измерения"}`).join("\n"));
  } else {
    lines.push("No targets are currently limited to a single public report.");
  }
  lines.push("");
  lines.push("## Top Targets");
  lines.push("");
  if (topTargets.length) {
    lines.push("| Target | Weather | Reports | Degraded | Top diagnosis |");
    lines.push("| --- | --- | ---: | ---: | --- |");
    for (const domain of topTargets) {
      lines.push(`| ${cell(domain.key)} | ${cell(domain.weather?.label_ru || domain.status)} | ${domain.total} | ${percent(domain.degraded_ratio)} | ${cell(domain.dominant_category?.title_ru || domain.dominant_category?.category)} |`);
    }
  } else {
    lines.push("No public reports yet. The dashboard will show synthetic demo data until the first accepted reports arrive.");
  }
  lines.push("");
  lines.push("## Privacy Boundary");
  lines.push("");
  lines.push("- Public reports do not include user IPs, raw DNS answers, headers, cookies, bodies, packet captures, traceroute hops, or exact location.");
  lines.push("- Single reports are useful for triage but should not be treated as evidence of a network-wide incident.");
  lines.push("- If VPN/tun/proxy-like local interfaces are detected, only a safe boolean marker can be published.");
  lines.push("");
  lines.push("## Volunteer Command");
  lines.push("");
  lines.push("```bash");
  lines.push("npx runet-blackbox check --pack dev --region Moscow --provider Rostelecom --copy-issue");
  lines.push("```");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function digestFileName(dateLike = new Date()) {
  return `${isoWeekLabel(new Date(dateLike))}.md`;
}

export function isoWeekLabel(date) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function percent(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function cell(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ")
    .trim();
}
