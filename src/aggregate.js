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

  return {
    generated_at: new Date().toISOString(),
    total_reports: reports.length,
    total_targets: domains.size,
    degraded_targets: Array.from(domains.values()).filter((group) => group.degraded > group.ok).length,
    status: overallStatus(reports),
    domains: sortedGroups(domains),
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
    degraded_ratio: group.total ? Number((group.degraded / group.total).toFixed(3)) : 0
  }));
  return values.sort((a, b) => {
    if (sortKey === "key") {
      return order === "asc" ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key);
    }
    return order === "asc" ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey];
  });
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
    diagnosis: {
      ...report.diagnosis,
      severity: metadata.severity,
      title: metadata.title
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
