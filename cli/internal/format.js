import { diagnosisMetadata } from "../../src/diagnosis-metadata.js";
import { TOOL_VERSION } from "../../src/constants.js";

export function formatHumanReport(report, options = {}) {
  const metadata = diagnosisMetadata(report.diagnosis.category);
  const lines = [];
  lines.push("Измерение Runet Blackbox");
  lines.push("");
  lines.push(`Цель:       ${report.target}`);
  lines.push(`Report ID:  ${report.report_id}`);
  lines.push(`Локация:    ${report.country}/${report.region}`);
  lines.push(`Сеть:       ${report.network.provider}${report.network.asn ? ` AS${report.network.asn}` : ""} (${report.network.connection_type})`);
  lines.push(`Диагноз:    ${metadata.title_ru || metadata.title} [${report.diagnosis.category}]`);
  lines.push(`Rule confidence: ${Math.round(report.diagnosis.confidence * 100)}% (эвристика, не вероятность)`);
  lines.push(`Summary:    ${metadata.summary_ru || metadata.summary}`);
  lines.push(`Next step:  ${metadata.next_step_ru || metadata.next_step}`);
  lines.push("");
  lines.push("Проверки:");
  for (const [name, result] of Object.entries(report.results)) {
    const latency = Number.isFinite(result.latency_ms) ? ` ${Math.round(result.latency_ms)}ms` : "";
    const detail = result.error ? ` - ${result.error}` : "";
    lines.push(`  ${name.padEnd(12)} ${result.status}${latency}${detail}`);
  }
  if (report.diagnosis.signals.length) {
    lines.push("");
    lines.push("Сигналы:");
    for (const signal of report.diagnosis.signals) {
      lines.push(`  - ${signal}`);
    }
  }
  lines.push("");
  lines.push("Приватность:");
  lines.push("  Публичные отчёты не содержат IP пользователя, сырые DNS-ответы, headers, cookies, bodies, packet captures и точную локацию.");
  if (report.environment?.suspected_vpn_or_tunnel) {
    lines.push("  Локальное предупреждение: замечены признаки VPN/tun/proxy-среды. Детали интерфейсов не публикуются.");
  }
  if (options.output) {
    lines.push("");
    lines.push(`JSON-отчёт записан в ${options.output}`);
  }
  if (options.issueFile) {
    lines.push(`GitHub issue body записан в ${options.issueFile}`);
  }
  if (options.copiedIssue) {
    lines.push("GitHub issue body подготовлен для clipboard.");
  }
  if (options.issueUrl) {
    lines.push("");
    lines.push("GitHub issue URL:");
    lines.push(options.issueUrl);
  }
  return `${lines.join("\n")}\n`;
}

export function formatBatchReport(bundle, options = {}) {
  const degraded = bundle.reports.filter((report) => report.diagnosis.category !== "ok");
  const lines = [];
  lines.push(`Пакет Runet Blackbox: ${bundle.pack.label_ru} [${bundle.pack.name}]`);
  lines.push(`Целей: ${bundle.reports.length}`);
  lines.push(`OK: ${bundle.reports.length - degraded.length}`);
  lines.push(`Degraded/needs attention: ${degraded.length}`);
  if (bundle.environment?.suspected_vpn_or_tunnel) {
    lines.push("");
    lines.push("Локальное предупреждение: замечены признаки VPN/tun/proxy-среды. Отчёт может не отражать обычную сеть провайдера.");
  }
  lines.push("");
  lines.push("Сводка:");
  for (const report of bundle.reports) {
    const metadata = diagnosisMetadata(report.diagnosis.category);
    const confidence = Math.round(report.diagnosis.confidence * 100);
    lines.push(`  ${report.target.padEnd(30)} ${report.diagnosis.category.padEnd(38)} ${confidence}%  ${metadata.title_ru || metadata.title}`);
  }
  lines.push("");
  lines.push("Приватность:");
  lines.push("  Bundle содержит только очищенные публичные отчёты. IP, headers, cookies, bodies, packet captures и точная локация не публикуются.");
  if (options.output) {
    lines.push(`JSON bundle записан в ${options.output}`);
  }
  if (options.issueFile) {
    lines.push(`GitHub issue body записан в ${options.issueFile}`);
  }
  if (options.copiedIssue) {
    lines.push("GitHub issue body подготовлен для clipboard.");
  }
  if (options.issueUrl) {
    lines.push("GitHub issue URL:");
    lines.push(options.issueUrl);
  }
  return `${lines.join("\n")}\n`;
}

export function formatDoctorReport(environment, options = {}) {
  const nodeMajor = Number(String(options.nodeVersion || "").split(".")[0]);
  const nodeOk = Number.isInteger(nodeMajor) && nodeMajor >= 22;
  const lines = [];
  lines.push("Runet Blackbox doctor");
  lines.push("");
  lines.push(`Node.js: ${options.nodeVersion || "unknown"} ${nodeOk ? "ok" : "needs 22+"}`);
  lines.push(`Platform: ${options.platform || process.platform}`);
  lines.push(`Clipboard candidates (availability not checked): ${(options.clipboardCommands || []).join(", ") || "none detected"}`);
  lines.push("");
  lines.push("Environment:");
  if (environment?.suspected_vpn_or_tunnel) {
    lines.push("  warning: похоже, активен VPN/tun/proxy adapter; публичный отчёт будет помечен safe boolean-маркером.");
    lines.push("  details: имена интерфейсов, IP и конфиги не публикуются.");
  } else {
    lines.push("  ok: явных VPN/tun/proxy-like интерфейсов не найдено.");
  }
  lines.push("");
  lines.push("Recommended local preflight (nothing uploaded):");
  lines.push("  node cli/bin/runet-blackbox.js preflight --config config.example.json --json");
  lines.push("");
  lines.push("Windows note:");
  lines.push("  Если DNS даёт ECONNREFUSED, сравни системный DNS с публичным резолвером через --compare-dns 8.8.8.8.");
  lines.push("  Для файлов предпочитай --output report.json вместо PowerShell Out-File.");
  return `${lines.join("\n")}\n`;
}

export function formatPacksList(packs) {
  const lines = [];
  lines.push("Доступные пакеты / Available packs:");
  lines.push("");
  for (const pack of packs) {
    lines.push(`${pack.name}`);
    lines.push(`  ${pack.label_ru} / ${pack.label}`);
    lines.push(`  ${pack.description_ru || pack.description}`);
    lines.push(`  targets: ${pack.targets.join(", ")}`);
    lines.push("");
  }
  lines.push("Пример / Example:");
  lines.push("  runet-blackbox check --pack dev --region Moscow --provider Rostelecom --copy-issue");
  return `${lines.join("\n")}\n`;
}

export function helpText() {
  return `Runet Blackbox v${TOOL_VERSION}
Локальная диагностика публичных зависимостей · Public dependency preflight

Usage:
  runet-blackbox preflight [target] [options]    CI gate, default pack: ci
  runet-blackbox check <target> [options]      Interactive root-origin diagnostics
  runet-blackbox check --pack <name> [options]
  runet-blackbox check --targets-file <file> [options]
  runet-blackbox packs | doctor | version
  runet-blackbox sample [--pretty]              Synthetic offline sample

Examples:
  node cli/bin/runet-blackbox.js preflight --config config.example.json --json
  node cli/bin/runet-blackbox.js preflight --pack ci --junit out/preflight.xml
  node cli/bin/runet-blackbox.js check github.com --compare-dns 1.1.1.1

Target selection (choose one, 1..32 public origin roots):
  --config <json>            version:1; targets or pack; CLI overrides config
  --targets-file <txt>       One hostname per line; # comments supported
  --pack <name>              ci, dev, ai, social, cloud, baseline

Network options:
  --timeout <ms>             Per-phase wall-clock budget, 250..60000 (5000)
  --concurrency <n>          Parallel targets, 1..4 (2)
  --max-redirects <n>        HTTP redirect limit, 0..5 (3)
  --max-body-bytes <n>       HTTP sample cap, 1024..65536 (65536)
  --dns, --dns-server <ip>   Explicit primary resolver; answers pin all probes
  --compare-dns <ip>         Up to 3 resolvers; comparison never changes the path
  --no-http                  check only; omit application-level probe

Context (optional; no geolocation lookup):
  --country <code>           Two letters; ZZ means unknown (default)
  --region <label>           Coarse region, 1..80 characters (unknown)
  --provider <label>         Coarse ISP/network label, 1..80 characters (unknown)
  --asn <number|ASnumber>    1..4294967295
  --connection-type <type>   unknown, home, mobile, office, public_wifi, hosting, other

Output:
  --json --pretty            Machine-readable stdout; logs use stderr
  -o, --output <file>        Atomic JSON snapshot, restrictive permissions
  --junit <file>             JUnit XML for CI test artifacts
  --prometheus <file>        Prometheus textfile snapshot; monitor staleness
  --verbose                 Structured progress on stderr
  --fail-on-degraded         check exits 2 on any non-ok result
  --issue-file <file>        Prepare public issue text locally; review first
  --issue-url                Print a prefilled public issue URL; does not submit
  --copy-issue               Copy public issue text using a bounded child process

Exit codes:
  0   Completed (preflight: all configured checks passed)
  2   Gate failed / --fail-on-degraded found a non-ok result
  64  Invalid arguments, config or unsafe target
  70  Internal or output I/O error
  130 Interrupted by SIGINT
  143 Terminated by SIGTERM

Only public HTTPS origin roots. No credentials, private targets, proxies or bypass.
HTTP expects final 2xx by default. Configure intended 401/403 responses explicitly.
DNS pins one address for consistency: this is not an exhaustive IPv4/IPv6 survey.
Nothing is sent to GitHub or a vendor automatically. See docs/CLI.md.
`;
}
