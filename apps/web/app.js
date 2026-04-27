const state = {
  aggregate: null,
  query: ""
};

const $ = (selector) => document.querySelector(selector);

async function loadAggregate() {
  const paths = ["data/aggregates/index.json", "../data/aggregates/index.json", "../../data/aggregates/index.json"];
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (response.ok) return response.json();
    } catch {
      // Try next local/deployed path.
    }
  }
  return {
    total_reports: 0,
    total_targets: 0,
    domains: [],
    providers: [],
    regions: [],
    categories: [],
    latest_reports: []
  };
}

function render() {
  const aggregate = state.aggregate;
  $("#total-reports").textContent = aggregate.total_reports;
  $("#total-targets").textContent = aggregate.total_targets;
  $("#degraded-targets").textContent = aggregate.degraded_targets ?? aggregate.domains.filter((domain) => domain.status === "degraded").length;
  $("#generated-at").textContent = aggregate.generated_at ? `Generated ${new Date(aggregate.generated_at).toISOString()}` : "No aggregate generated yet";

  renderTargets(aggregate.domains);
  renderGroups("#providers", aggregate.providers);
  renderGroups("#regions", aggregate.regions);
  renderGroups("#categories", aggregate.categories);
  renderLatest(aggregate.latest_reports);
}

function matchesQuery(value) {
  return JSON.stringify(value).toLowerCase().includes(state.query.toLowerCase());
}

function renderTargets(domains) {
  const filtered = domains.filter(matchesQuery);
  $("#targets").innerHTML = filtered.length
    ? filtered
        .map(
          (domain) => `<div class="row">
            <strong>${escapeHtml(domain.key)}</strong>
            <span>${domain.total} reports</span>
            <span>${Math.round(domain.degraded_ratio * 100)}% degraded</span>
            <span class="pill ${classForStatus(domain.status)}">${domain.status}</span>
          </div>`
        )
        .join("")
    : `<p class="muted">No matching targets yet.</p>`;
}

function renderGroups(selector, groups) {
  const filtered = (groups || []).filter(matchesQuery).slice(0, 12);
  $(selector).innerHTML = filtered.length
    ? filtered
        .map(
          (group) => `<div class="list-row">
            <span>${escapeHtml(group.key)}</span>
            <span class="pill ${classForStatus(group.status)}">${group.degraded}/${group.total}</span>
          </div>`
        )
        .join("")
    : `<p class="muted">No data yet.</p>`;
}

function renderLatest(reports) {
  const filtered = reports.filter(matchesQuery).slice(0, 25);
  $("#latest").innerHTML = filtered.length
    ? filtered
        .map(
          (report) => `<div class="row">
            <strong>${escapeHtml(report.target)}</strong>
            <span>${escapeHtml(report.region)}</span>
            <span>${escapeHtml(report.provider)}</span>
            <span class="pill ${classForStatus(report.diagnosis.severity || report.diagnosis.category)}">${escapeHtml(report.diagnosis.title || report.diagnosis.category)}</span>
          </div>`
        )
        .join("")
    : `<p class="muted">No reports yet.</p>`;
}

function classForStatus(status) {
  if (status === "ok" || status === "mostly_ok") return "ok";
  if (status === "warning") return "warning";
  if (status === "unknown" || status === "no_data") return "unknown";
  return "degraded";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

state.aggregate = await loadAggregate();
$("#search").addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});
render();
