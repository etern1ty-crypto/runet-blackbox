import { validateReport } from "./report-schema.js";
import { sanitizeReport } from "./privacy.js";
import { reportDay } from "./time.js";
import { diagnosisMetadata } from "./diagnosis-metadata.js";

export function aggregateReports(inputReports) {
  const reports = [];
  for (const report of inputReports) {
    try {
      const sanitized = sanitizeReport(report);
      const validation = validateReport(sanitized);
      if (validation.valid) {
        reports.push(sanitized);
      }
    } catch {
      // Invalid external input should not break aggregation.
    }
  }

  const domains = new Map();
  const providers = new Map();
  const regions = new Map();
  const days = new Map();
  const categories = new Map();

  for (const report of reports) {
    incrementDomain(domains, report);
    incrementGroup(providers, providerKey(report), report);
    incrementGroup(regions, report.region, report);
    incrementGroup(days, reportDay(report.timestamp_utc), report);
    incrementGroup(categories, report.diagnosis.category, report);
  }

  const domainGroups = sortedGroups(domains);

  return {
    generated_at: new Date().toISOString(),
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

export function domainAggregate(inputReports, target) {
  const reports = [];
  for (const report of inputReports) {
    try {
      const sanitized = sanitizeReport(report);
      if (validateReport(sanitized).valid && sanitized.target === target) {
        reports.push(sanitized);
      }
    } catch {
      // Invalid external input should not break aggregation.
    }
  }
  const aggregate = aggregateReports(reports);
  return {
    target,
    ...aggregate
  };
}

function incrementDomain(domains, report) {
  incrementGroup(domains, report.target, report);
}

function incrementGroup(map, key, report) {
  const safeKey = key || "unknown";
  if (!map.has(safeKey)) {
    map.set(safeKey, {
      key: safeKey,
      total: 0,
      ok: 0,
      degraded: 0,
      categories: {},
      last_seen: null
    });
  }
  const group = map.get(safeKey);
  group.total += 1;
  if (report.diagnosis.category === "ok") {
    group.ok += 1;
  } else {
    group.degraded += 1;
  }
  group.categories[report.diagnosis.category] = (group.categories[report.diagnosis.category] || 0) + 1;
  if (!group.last_seen || report.timestamp_utc > group.last_seen) {
    group.last_seen = report.timestamp_utc;
  }
}

function sortedGroups(map, sortKey = "total", order = "desc") {
  const values = Array.from(map.values()).map((group) => ({
    ...group,
    status: group.degraded > group.ok ? "degraded" : "ok",
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
  if (group.total <= 1) {
    return {
      status: "reports_needed",
      label_ru: "Нужны отчёты",
      label: "Reports needed",
      note_ru: "Один отчёт полезен для triage, но не подтверждает сетевой паттерн.",
      note: "One report is useful for triage, but does not confirm a network pattern."
    };
  }
  if (group.degraded > group.ok && group.total >= 3) {
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
  if (group.total < 3) {
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
  const degraded = reports.filter((report) => report.diagnosis.category !== "ok").length;
  return degraded > reports.length / 2 ? "degraded" : "mostly_ok";
}

function datasetQuality(reports) {
  if (reports.length === 0) {
    return {
      level: "no_data",
      label_ru: "Нет данных",
      label: "No data",
      note_ru: "Dashboard покажет демо, пока нет публичных отчётов.",
      note: "Dashboard shows demo data until public reports arrive."
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
    note_ru: "Есть достаточный объём отчётов для осторожного сравнения провайдеров, регионов и целей.",
    note: "Enough reports exist for cautious provider, region, and target comparisons."
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
      label_ru: "Средняя уверенность",
      label: "Medium confidence",
      note_ru: "Можно сравнивать осторожно, но контекст всё ещё важен.",
      note: "Cautious comparison is possible, but context still matters."
    };
  }
  return {
    score: 0.9,
    level: "higher",
    label_ru: "Больше подтверждений",
    label: "More corroborated",
    note_ru: "Есть несколько подтверждений, но это всё ещё community evidence.",
    note: "Several corroborating reports exist, still community evidence."
  };
}
