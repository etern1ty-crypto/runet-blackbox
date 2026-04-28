import { diagnosisMetadata } from "../../src/diagnosis-metadata.js";

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

export function helpText() {
  return `Runet Blackbox v0.1.0
Открытая диагностика нестабильных сетей.
Open network observability for unstable networks.

Использование / Usage:
  runet-blackbox check <domain> [options]
  runet-blackbox sample [--pretty]
  runet-blackbox version

Примеры / Examples:
  runet-blackbox check github.com --region Moscow --provider Rostelecom
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
