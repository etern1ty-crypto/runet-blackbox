const state = {
  aggregate: null,
  demo: false,
  query: "",
  selectedTarget: null
};

const $ = (selector) => document.querySelector(selector);

const categoryRu = {
  ok: "Доступно",
  dns_timeout: "Таймаут DNS",
  dns_nxdomain: "DNS NXDOMAIN",
  dns_suspicious_answer: "Подозрительный DNS",
  dns_failure: "Ошибка DNS",
  tcp_timeout: "Таймаут TCP",
  tcp_reset: "Сброс TCP",
  tcp_refused: "TCP отказ",
  possible_tls_dpi_or_middlebox_reset: "Возможный TLS/DPI сброс",
  tls_timeout: "Таймаут TLS",
  tls_certificate_mismatch: "Проблема сертификата TLS",
  http_blockpage_suspected: "Возможная blockpage",
  http_unexpected_redirect: "Неожиданный редирект",
  service_global_outage_possible: "Возможный сбой сервиса",
  local_network_problem_possible: "Локальная проблема сети",
  measurement_error: "Ошибка измерения",
  insufficient_data: "Недостаточно данных"
};

async function loadAggregate() {
  const real = await loadFirstJson(["data/aggregates/index.json", "../data/aggregates/index.json", "../../data/aggregates/index.json"]);
  if (real && real.total_reports > 0) {
    return { aggregate: real, demo: false };
  }

  const demo = await loadFirstJson(["data/demo/aggregates/index.json", "../data/demo/aggregates/index.json", "../../data/demo/aggregates/index.json"]);
  if (demo) {
    return { aggregate: demo, demo: true };
  }

  return {
    aggregate: real || {
      total_reports: 0,
      total_targets: 0,
      domains: [],
      providers: [],
      regions: [],
      categories: [],
      latest_reports: []
    },
    demo: false
  };
}

async function loadFirstJson(paths) {
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (response.ok) return response.json();
    } catch {
      // Try next local/deployed path.
    }
  }
  return null;
}

function render() {
  const aggregate = state.aggregate;
  $("#total-reports").textContent = aggregate.total_reports || 0;
  $("#total-targets").textContent = aggregate.total_targets || 0;
  $("#degraded-targets").textContent = aggregate.weather?.incident_candidates ?? aggregate.degraded_targets ?? (aggregate.domains || []).filter((domain) => domain.status === "degraded").length;
  $("#generated-at").textContent = aggregate.generated_at
    ? `Агрегаты обновлены: ${new Date(aggregate.generated_at).toLocaleString("ru-RU", { timeZone: "UTC" })} UTC`
    : "Агрегаты пока не созданы";
  $("#data-mode").textContent = state.demo
    ? "Демо-режим: показаны искусственные безопасные данные, пока реальные отчёты не собраны. Demo data is synthetic."
    : datasetNote(aggregate.dataset_quality);

  renderTargets(aggregate.domains || []);
  renderWeather(aggregate.weather || {});
  renderTargetDetail(selectedDomain(aggregate.domains || []));
  renderTimeline(aggregate.days || []);
  renderGroups("#providers", aggregate.providers || []);
  renderGroups("#regions", aggregate.regions || []);
  renderGroups("#categories", aggregate.categories || [], { categories: true });
  renderLatest(aggregate.latest_reports || []);
}

function matchesQuery(value) {
  return JSON.stringify(value).toLowerCase().includes(state.query.toLowerCase());
}

function renderTargets(domains) {
  const filtered = domains.filter(matchesQuery);
  if (!state.selectedTarget && filtered[0]) {
    state.selectedTarget = filtered[0].key;
  }
  $("#targets").innerHTML = filtered.length
    ? filtered
        .map(
          (domain) => `<button class="row target-row ${domain.key === state.selectedTarget ? "selected" : ""}" type="button" data-target="${escapeAttr(domain.key)}">
            <div>
              <strong>${escapeHtml(domain.key)}</strong>
              <small>${domain.total} отчётов · ${escapeHtml(domain.dominant_category?.title_ru || categoryLabel(domain.dominant_category?.category || "insufficient_data"))}</small>
            </div>
            <span>${Math.round(domain.degraded_ratio * 100)}% degraded</span>
            <span>${formatDate(domain.last_seen)}</span>
            <span class="pill ${classForStatus(domain.weather?.status || domain.status)}">${escapeHtml(domain.weather?.label_ru || statusLabel(domain.status))} · ${escapeHtml(domain.credibility?.label_ru || "sample")}</span>
          </button>`
        )
        .join("")
    : emptyState("Пока нет целей по этому фильтру.", "No matching targets yet.");

  document.querySelectorAll(".target-row").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedTarget = row.dataset.target;
      render();
    });
  });
}

function renderWeather(weather) {
  $("#weather-ok").textContent = weather.mostly_ok || 0;
  $("#weather-weak").textContent = weather.weak_signals || 0;
  $("#weather-needed").textContent = weather.reports_needed || 0;
  $("#weather-incidents").textContent = weather.incident_candidates || 0;
}

function renderTargetDetail(domain) {
  if (!domain) {
    $("#target-detail-title").textContent = "Цель не выбрана";
    $("#target-card").href = "data/aggregates/cards/overview.svg";
    $("#target-detail").innerHTML = emptyState("Выбери цель в таблице выше.", "Select a target above.");
    return;
  }
  $("#target-detail-title").textContent = domain.key;
  $("#target-card").href = state.demo ? "data/aggregates/cards/overview.svg" : `data/aggregates/cards/${safeFileName(domain.key)}.svg`;
  const providerRows = compactBreakdown(domain.providers || [], "Провайдеров пока мало.");
  const regionRows = compactBreakdown(domain.regions || [], "Регионов пока мало.");
  const latestRows = (domain.latest_reports || []).slice(0, 4).map((report) => `<li>${formatDate(report.timestamp_utc)} · ${escapeHtml(report.region)} · ${escapeHtml(report.provider)} · ${escapeHtml(report.diagnosis.title_ru || categoryLabel(report.diagnosis.category))}</li>`).join("");
  $("#target-detail").innerHTML = `
    <div class="detail-summary">
      <span class="pill ${classForStatus(domain.weather?.status || domain.status)}">${escapeHtml(domain.weather?.label_ru || statusLabel(domain.status))}</span>
      <p>${escapeHtml(domain.weather?.note_ru || "Одиночные отчёты полезны для triage, но не являются доказательством.")}</p>
      <p><strong>${escapeHtml(domain.credibility?.label_ru || "sample")}</strong>: ${escapeHtml(domain.credibility?.note_ru || "")}</p>
    </div>
    <div class="detail-columns">
      <div><h3>Провайдеры</h3>${providerRows}</div>
      <div><h3>Регионы</h3>${regionRows}</div>
    </div>
    <div class="detail-latest">
      <h3>Последние сигналы</h3>
      ${latestRows ? `<ul>${latestRows}</ul>` : emptyState("Пока нет последних отчётов.", "No latest reports yet.")}
    </div>
  `;
}

function renderTimeline(days) {
  const recent = days.slice(-14);
  $("#timeline").innerHTML = recent.length
    ? recent
        .map((day) => {
          const degraded = Math.round((day.degraded_ratio || 0) * 100);
          const ok = 100 - degraded;
          return `<div class="timeline-row">
            <span>${escapeHtml(day.key)}</span>
            <div class="timeline-bar" aria-label="${degraded}% degraded">
              <i class="ok" style="width:${ok}%"></i><i class="bad" style="width:${degraded}%"></i>
            </div>
            <strong>${day.total}</strong>
          </div>`;
        })
        .join("")
    : emptyState("Пока нет временного ряда.", "No timeline yet.");
}

function renderGroups(selector, groups, options = {}) {
  const filtered = groups.filter(matchesQuery).slice(0, 12);
  $(selector).innerHTML = filtered.length
    ? filtered
        .map(
          (group) => `<div class="list-row">
            <span>${escapeHtml(options.categories ? categoryLabel(group.key) : group.key)}</span>
            <span class="pill ${classForStatus(group.status)}">${group.degraded}/${group.total}</span>
          </div>`
        )
        .join("")
    : emptyState("Данных пока нет.", "No data yet.");
}

function renderLatest(reports) {
  const filtered = reports.filter(matchesQuery).slice(0, 25);
  $("#latest").innerHTML = filtered.length
    ? filtered
        .map(
          (report) => `<div class="row">
            <div>
              <strong>${escapeHtml(report.target)}</strong>
              <small>${formatDate(report.timestamp_utc)}</small>
            </div>
            <span>${escapeHtml(report.region)}</span>
            <span>${escapeHtml(report.provider)}</span>
            <span class="pill ${classForStatus(report.diagnosis.severity || report.diagnosis.category)}">${escapeHtml(report.diagnosis.title_ru || categoryLabel(report.diagnosis.category))} · ${escapeHtml(report.credibility?.label_ru || "sample")}</span>
          </div>`
        )
        .join("")
    : emptyState("Пока нет опубликованных отчётов. Можно стать первым источником данных.", "No public reports yet.");
}

function categoryLabel(category) {
  return categoryRu[category] || category;
}

function statusLabel(status) {
  if (status === "ok" || status === "mostly_ok") return "ok";
  if (status === "warning") return "warning";
  if (status === "unknown" || status === "no_data") return "no data";
  return "degraded";
}

function datasetNote(quality) {
  return quality?.note_ru || "Одиночные отчёты полезны для triage, но не доказывают массовую деградацию.";
}

function classForStatus(status) {
  if (status === "ok" || status === "mostly_ok") return "ok";
  if (status === "warning" || status === "weak_signal" || status === "reports_needed") return "warning";
  if (status === "unknown" || status === "no_data") return "unknown";
  return "degraded";
}

function formatDate(value) {
  if (!value) return "нет даты";
  return new Date(value).toISOString().slice(0, 16).replace("T", " ");
}

function emptyState(ru, en) {
  return `<p class="muted">${escapeHtml(ru)} <span lang="en">${escapeHtml(en)}</span></p>`;
}

function selectedDomain(domains) {
  return domains.find((domain) => domain.key === state.selectedTarget) || domains.filter(matchesQuery)[0] || domains[0] || null;
}

function compactBreakdown(groups, emptyText) {
  return groups.length
    ? `<div class="mini-list">${groups.slice(0, 5).map((group) => `<span><b>${escapeHtml(group.key)}</b><em>${group.degraded}/${group.total}</em></span>`).join("")}</div>`
    : `<p class="muted">${escapeHtml(emptyText)}</p>`;
}

function safeFileName(value) {
  return String(value).replace(/[^a-z0-9.-]/gi, "_");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

const loaded = await loadAggregate();
state.aggregate = loaded.aggregate;
state.demo = loaded.demo;
$("#search").addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});
render();
