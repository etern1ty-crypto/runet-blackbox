import { prepareReport } from "./report.js";
import { reportDay } from "./time.js";
import { diagnosisMetadata } from "./diagnosis-metadata.js";

export function aggregateReports(inputReports, options = {}) {
  const now = new Date(options.now || Date.now());
  const windowHours = options.windowHours === undefined ? 24 : options.windowHours;
  if (!Number.isFinite(now.getTime()) || (windowHours !== null && (!Number.isFinite(windowHours) || windowHours <= 0 || windowHours > 8760))) throw new Error("invalid aggregation window");
  const earliest = windowHours === null ? -Infinity : now.getTime() - windowHours * 3600000;
  const reports = [];
  const seen = new Set();
  const excluded = { invalid: 0, duplicate: 0, outside_window: 0, future: 0, tunnel: 0 };
  for (const raw of inputReports) {
    let report;
    try { report = prepareReport(raw); }
    catch { excluded.invalid++; continue; }
    if (seen.has(report.report_id)) { excluded.duplicate++; continue; }
    seen.add(report.report_id);
    const timestamp = Date.parse(report.timestamp_utc);
    if (timestamp > now.getTime() + 5 * 60000) { excluded.future++; continue; }
    if (timestamp < earliest) { excluded.outside_window++; continue; }
    if (!options.includeVpn && report.environment?.suspected_vpn_or_tunnel) { excluded.tunnel++; continue; }
    reports.push(report);
  }
  reports.sort((a, b) => a.timestamp_utc.localeCompare(b.timestamp_utc) || a.report_id.localeCompare(b.report_id));

  const domains = new Map();
  const providers = new Map();
  const regions = new Map();
  const days = new Map();
  const categories = new Map();
  const domainDetails = new Map();

  for (const report of reports) {
    incrementDomain(domains, report);
    incrementDomainDetails(domainDetails, report);
    incrementGroup(providers, providerKey(report), report);
    incrementGroup(regions, `${report.country}/${report.region}`, report);
    incrementGroup(days, reportDay(report.timestamp_utc), report);
    incrementGroup(categories, report.diagnosis.category, report);
  }

  const domainGroups = sortedGroups(domains).map((group) => enrichDomainGroup(group, domainDetails.get(group.key)));

  return {
    generated_at: now.toISOString(),
    window_hours: windowHours,
    window_start: Number.isFinite(earliest) ? new Date(earliest).toISOString() : null,
    excluded,
    total_reports: reports.length,
    total_targets: domains.size,
    degraded_targets: Array.from(domains.values()).filter((group) => group.degraded > group.ok).length,
    status: overallStatus(reports),
    dataset_quality: datasetQuality(reports),
    weather: weatherSummary(domainGroups),
    incident_candidates: domainGroups.filter((group) => group.weather.status === "incident_candidate"),
    domains: domainGroups,
    providers: sortedGroups(providers),
    regions: sortedGroups(regions),
    days: sortedGroups(days, "key", "asc"),
    categories: sortedGroups(categories),
    latest_reports: reports
      .slice()
      .sort((a, b) => b.timestamp_utc.localeCompare(a.timestamp_utc))
      .slice(0, 100)
      .map(publicReportSummary)
  };
}

export function domainAggregate(inputReports, target, options = {}) {
  return { target, ...aggregateReports(inputReports.filter(report => report?.target === target), options) };
}

function incrementDomain(domains, report) {
  incrementGroup(domains, report.target, report);
}

function incrementDomainDetails(map, report) {
  if (!map.has(report.target)) {
    map.set(report.target, {
      providers: new Map(),
      regions: new Map(),
      days: new Map(),
      reports: []
    });
  }
  const detail = map.get(report.target);
  incrementGroup(detail.providers, providerKey(report), report);
  incrementGroup(detail.regions, `${report.country}/${report.region}`, report);
  incrementGroup(detail.days, reportDay(report.timestamp_utc), report);
  detail.reports.push(report);
}

function incrementGroup(map, key, report) {
  const safeKey = key || "unknown";
  if (!map.has(safeKey)) {
    map.set(safeKey, {
      key: safeKey,
      total: 0,
      ok: 0,
      degraded: 0,
      unknown: 0,
      categories: {},
      last_seen: null
    });
  }
  const group = map.get(safeKey);
  group.total += 1;
  if (report.diagnosis.category === "ok") {
    group.ok += 1;
  } else if (["measurement_error", "insufficient_data"].includes(report.diagnosis.category)) {
    group.unknown += 1;
  } else {
    group.degraded += 1;
  }
  group.categories[report.diagnosis.category] = (group.categories[report.diagnosis.category] || 0) + 1;
  if (!group.last_seen || report.timestamp_utc > group.last_seen) {
    group.last_seen = report.timestamp_utc;
  }
}

function enrichDomainGroup(group, detail) {
  const providers = detail ? sortedGroups(detail.providers) : [];
  const regions = detail ? sortedGroups(detail.regions) : [];
  const days = detail ? sortedGroups(detail.days, "key", "asc") : [];
  const latestReports = detail
    ? detail.reports
        .slice()
        .sort((a, b) => b.timestamp_utc.localeCompare(a.timestamp_utc))
        .slice(0, 25)
        .map(publicReportSummary)
    : [];

  return {
    ...group,
    dominant_category: dominantCategory(group.categories),
    providers,
    regions,
    days,
    latest_reports: latestReports,
    provider_incident_candidates: providers.filter((provider) => provider.weather.status === "incident_candidate" || provider.weather.status === "degraded_candidate")
  };
}

function sortedGroups(map, sortKey = "total", order = "desc") {
  const values = Array.from(map.values()).map((group) => ({
    ...group,
    status: group.ok + group.degraded === 0 ? "unknown" : group.degraded > group.ok ? "degraded" : group.ok > group.degraded ? "ok" : "unknown",
    degraded_ratio: group.total ? Number((group.degraded / group.total).toFixed(3)) : 0,
    credibility: credibilityFor(group.total),
    weather: weatherFor(group)
  }));
  return values.sort((a, b) => {
    if (sortKey === "key") {
      return order === "asc" ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key);
    }
    return order === "asc" ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey];
  });
}

function dominantCategory(categories) {
  const entries = Object.entries(categories || {}).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });
  const [category = "insufficient_data", count = 0] = entries[0] || [];
  const metadata = diagnosisMetadata(category);
  return {
    category,
    count,
    severity: metadata.severity,
    title: metadata.title,
    title_ru: metadata.title_ru || metadata.title
  };
}

function weatherSummary(domains) {
  return {
    reports_needed: domains.filter((group) => group.weather.status === "reports_needed").length,
    weak_signals: domains.filter((group) => group.weather.status === "weak_signal").length,
    degraded_candidates: domains.filter((group) => group.weather.status === "degraded_candidate").length,
    incident_candidates: domains.filter((group) => group.weather.status === "incident_candidate").length,
    mostly_ok: domains.filter((group) => group.weather.status === "mostly_ok").length
  };
}

function weatherFor(group) {
  if (group.ok + group.degraded === 0 || (group.total > 1 && group.ok === group.degraded)) {
    return { status: "weak_signal", label_ru: "Нет решающего сигнала", label: "Inconclusive", note_ru: "Ошибки измерения и неполные проверки не считаются деградацией сервиса.", note: "Incomplete checks and measurement errors are not service failures." };
  }
  if (group.total <= 1) {
    return {
      status: "reports_needed",
      label_ru: "Нужны отчёты",
      label: "Reports needed",
      note_ru: "Один отчёт полезен для triage, но не подтверждает сетевой паттерн.",
      note: "One report is useful for triage, but does not confirm a network pattern."
    };
  }
  if (group.degraded >= 3 && group.degraded > group.ok + group.unknown) {
    return {
      status: "incident_candidate",
      label_ru: "Кандидат на инцидент",
      label: "Incident candidate",
      note_ru: "Несколько отчётов указывают на деградацию; нужны независимые сети и повторные замеры.",
      note: "Several reports point to degradation; independent networks and repeats are still needed."
    };
  }
  if (group.degraded > group.ok) {
    return {
      status: "degraded_candidate",
      label_ru: "Сигнал деградации",
      label: "Degraded candidate",
      note_ru: "Есть симптомы деградации, но выборка пока мала.",
      note: "Degradation symptoms exist, but the sample is still small."
    };
  }
  if (group.total < 3 || group.ok <= group.degraded + group.unknown) {
    return {
      status: "weak_signal",
      label_ru: "Слабый сигнал",
      label: "Weak signal",
      note_ru: "Пока мало данных для уверенной сводки.",
      note: "Not enough data for a confident status."
    };
  }
  return {
    status: "mostly_ok",
    label_ru: "В основном доступно",
    label: "Mostly OK",
    note_ru: "Текущие публичные отчёты в основном успешны.",
    note: "Current public reports are mostly successful."
  };
}

function providerKey(report) {
  const asn = report.network.asn ? `AS${report.network.asn}` : "AS?";
  return `${report.network.provider} (${asn})`;
}

function publicReportSummary(report) {
  const metadata = diagnosisMetadata(report.diagnosis.category);
  return {
    report_id: report.report_id || null,
    timestamp_utc: report.timestamp_utc,
    target: report.target,
    country: report.country,
    region: report.region,
    provider: report.network.provider,
    asn: report.network.asn,
    connection_type: report.network.connection_type,
    environment: report.environment || { suspected_vpn_or_tunnel: false },
    credibility: credibilityFor(1),
    diagnosis: {
      ...report.diagnosis,
      severity: metadata.severity,
      title: metadata.title,
      title_ru: metadata.title_ru || metadata.title
    }
  };
}

function overallStatus(reports) {
  if (reports.length === 0) {
    return "no_data";
  }
  const decisive = reports.filter(report => !["measurement_error", "insufficient_data"].includes(report.diagnosis.category));
  const degraded = decisive.filter(report => report.diagnosis.category !== "ok").length;
  if (!decisive.length || degraded * 2 === decisive.length) return "unknown";
  return degraded > decisive.length / 2 ? "degraded" : "mostly_ok";
}

function datasetQuality(reports) {
  if (reports.length === 0) {
    return {
      level: "no_data",
      label_ru: "Нет данных",
      label: "No data",
      note_ru: "Нет измерений в выбранном окне. Демо включается только явно.",
      note: "No measurements in the selected window. Demo requires explicit opt-in."
    };
  }
  if (reports.length < 30) {
    return {
      level: "early",
      label_ru: "Ранний набор данных",
      label: "Early dataset",
      note_ru: "Одиночные отчёты полезны для triage, но не доказывают массовую деградацию.",
      note: "Single reports are useful for triage, but do not prove widespread degradation."
    };
  }
  return {
    level: "community",
    label_ru: "Community dataset",
    label: "Community dataset",
    note_ru: "Объём отчётов не доказывает независимость источников; это не SLA и не статистика пользователей.",
    note: "Report count does not prove independent sources; this is not an SLA or a user population estimate."
  };
}

function credibilityFor(total) {
  if (total <= 1) {
    return {
      score: 0.2,
      level: "single_report",
      label_ru: "Один отчёт",
      label: "Single report",
      note_ru: "Используй как сигнал triage, не как доказательство.",
      note: "Use as a triage signal, not proof."
    };
  }
  if (total < 5) {
    return {
      score: 0.45,
      level: "low",
      label_ru: "Мало отчётов",
      label: "Low sample",
      note_ru: "Нужны повторные измерения и другие сети.",
      note: "Needs repeat measurements and other networks."
    };
  }
  if (total < 15) {
    return {
      score: 0.7,
      level: "medium",
      label_ru: "Больше измерений",
      label: "More measurements",
      note_ru: "Можно сравнивать осторожно, но контекст всё ещё важен.",
      note: "Cautious comparison is possible, but context still matters."
    };
  }
  return {
    score: 0.9,
    level: "higher",
    label_ru: "Большая выборка",
    label: "Larger sample",
    note_ru: "Это объём выборки, не вероятность и не подтверждение независимости источников.",
    note: "Sample volume, not a probability or proof of independent reporters."
  };
}
