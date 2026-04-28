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
  lines.push(`Confidence: ${Math.round(report.diagnosis.confidence * 100)}%`);
  lines.push(`Summary:    ${metadata.summary_ru || metadata.summary}`);
  lines.push(`Next step:  ${metadata.next_step_ru || metadata.next_step}`);
  lines.push("");
  lines.push("Проверки:");
  for (const [name, result] of Object.entries(report.results)) {
    const latency = Number.isFinite(result.latency_ms) ? ` ${Math.round(result.latency_ms)}ms` : "";
    const detail = result.error ? ` - ${result.error}` : "";
    lines.push(`  ${name.padEnd(8)} ${result.status}${latency}${detail}`);
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
Открытая диагностика нестабильных сетей.
Open network observability for unstable networks.

Использование / Usage:
  runet-blackbox check <domain> [options]
  runet-blackbox check --pack <name> [options]
  runet-blackbox packs
  runet-blackbox sample [--pretty]
  runet-blackbox version

Примеры / Examples:
  runet-blackbox check github.com --region Moscow --provider Rostelecom
  runet-blackbox check --pack dev --region Moscow --provider Rostelecom --copy-issue
  runet-blackbox check --pack ai --region Moscow --provider MTS --issue-file ai.issue.md
  runet-blackbox check github.com --region Moscow --provider MTS --connection-type mobile --json --pretty
  runet-blackbox check github.com --dns 8.8.8.8 --json --pretty
  runet-blackbox check github.com --json --pretty --issue-file report.issue.md
  runet-blackbox check github.com --json --pretty --copy-issue
  runet-blackbox check example.com --no-http --fail-on-degraded
  runet-blackbox sample --pretty

Опции / Options:
  --country <code>           ISO-код страны, по умолчанию RU
  --region <name>            Крупный регион без точного адреса, default unknown
  --provider <name>          Провайдер/ISP, default unknown
  --asn <number|ASnumber>    ASN сети
  --connection-type <type>   unknown, home, mobile, office, public_wifi, hosting, other
  --timeout <ms>             Таймаут проверки, 250..60000, default 5000
  --dns, --dns-server <ip>   Явный DNS-резолвер для сравнения
  --no-http                  Не делать HTTP/HTTPS запрос после TLS
  --json                     Напечатать JSON-отчёт
  --pretty                   Красиво форматировать JSON
  --issue-file <file>        Записать готовый GitHub issue body
  --copy-issue               Скопировать GitHub issue body в clipboard, если возможно
  --pack <name>              Проверить готовый набор целей: dev, ai, social, cloud, baseline
  --fail-on-degraded         Exit 2, если диагноз не ok
  -o, --output <file>        Записать JSON-отчёт в файл

Коды выхода / Exit codes:
  0  Измерение завершено
  2  Измерение завершено, --fail-on-degraded нашёл деградацию
  64 Ошибка аргументов CLI
  70 Внутренняя ошибка

Важно: это не VPN, не proxy и не инструмент обхода. Только measurement/diagnostics.
`;
}
