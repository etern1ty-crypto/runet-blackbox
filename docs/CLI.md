# API / CLI справочник

## Стабильная публичная поверхность

Публичная поверхность версии 0.4 — CLI и [JSON Schema](../schemas/report.schema.json). REST API, daemon, `/probe` endpoint и Prometheus scrape server отсутствуют. `src/*` и `cli/internal/*` не объявлены стабильным npm library API; внутренние DI hooks нужны тестам, а не внешнему вводу.

Запуск из исходников: `node cli/bin/runet-blackbox.js`. После установки локального `.tgz`: `runet-blackbox`. Наличие опубликованного npm package 0.4.0 не предполагается.

## Команды

| Команда | Назначение |
| --- | --- |
| `preflight [target]` | CI gate: по умолчанию pack `ci`, обязательный HTTP, fail-on-degraded включён |
| `check <target>` | Диагностика одной origin root; по умолчанию code 0 после завершённого измерения, даже при degraded |
| `check --pack <name>` | Bundle выбранного набора |
| `check --config <file>` | Цели и параметры из JSON |
| `check --targets-file <file>` | Bundle публичных hosts из textfile |
| `packs` | Доступные наборы и цели; без сетевых запросов |
| `doctor` | Node/platform и осторожное VPN-предупреждение; clipboard candidates, не проверка их установки |
| `sample [--pretty]` | Явно синтетический offline report |
| `version` / `--version` | Версия |
| `help` / `--help` | Краткая справка |

## Флаги

| Flag | Описание |
| --- | --- |
| `--config <json>` | Строгий version-1 config; [полная схема параметров](CONFIGURATION.md) |
| `--pack <name>` | `ci/dev/ai/social/cloud/baseline` |
| `--targets-file <txt>` | Host на строку; пустые строки и `#` comments игнорируются |
| `--timeout <ms>` | 250–60000, default 5000 |
| `--concurrency <n>` | 1–4, default 2 |
| `--max-redirects <n>` | 0–5, default 3 |
| `--max-body-bytes <n>` | 1024–65536, default 65536 |
| `--dns`, `--dns-server <ip>` | Primary resolver |
| `--compare-dns`, `--dns-compare <ip>` | Comparison; можно повторять до 3 уникальных IP |
| `--no-http` | Только `check`; transport-only результат явно сообщает, что HTTP не проверен |
| `--country`, `--region`, `--provider`, `--asn`, `--connection-type` | Добровольный coarse context |
| `--json`, `--pretty` | JSON в stdout; `pretty` управляет форматированием JSON |
| `-o`, `--output <file>` | Полный JSON snapshot |
| `--junit <file>` | JUnit XML: одна testcase на target; не-ok — failure |
| `--prometheus <file>` | Textfile exposition; не HTTP endpoint |
| `--verbose` | Structured progress в stderr; stdout остаётся JSON |
| `--fail-on-degraded` | Включить gate для `check`; у `preflight` он всегда включён |
| `--issue-file <file>` | Подготовить markdown для добровольной публикации; не отправляет |
| `--issue-url` | Напечатать prefilled public GitHub URL при размере ≤7600 bytes |
| `--copy-issue` | Подготовить clipboard; providers вызываются без shell и с timeout |

Неизвестные flags и лишние arguments не игнорируются. Формат `--flag=value` не поддерживается: используйте пробел.

## Коды выхода

| Code | Значение |
| --- | --- |
| `0` | Измерение завершено; для preflight все targets OK |
| `2` | Не-ok результат при включённом gate |
| `64` | Ошибка arguments/config/unsafe target; не начинайте retry storm |
| `70` | Внутренняя ошибка или сбой записи output; результат публикации не считать успешным |
| `130` | SIGINT: измерение прервано |
| `143` | SIGTERM: процесс завершён по сигналу |

Gate считает `insufficient_data` и `measurement_error` неуспехом; это **не означает** доказанную недоступность сервиса. В агрегатах они отдельно относятся к unknown.

## JSON, JUnit, Prometheus

Single `check target --json` выдаёт report. `preflight`, packs, config и targets-file выдают bundle с `bundle_schema_version`, tool version, rounded `generated_at`, pack metadata, environment flag и `reports`.

```bash
node cli/bin/runet-blackbox.js preflight --config config.example.json --json --output out/report.json --junit out/report.xml --prometheus out/report.prom
```

Prometheus metrics:

- `runet_blackbox_success{target}` — 1/0 для configured checks.
- `runet_blackbox_probe_duration_seconds{target,probe}` — длительность конкретной фазы; **не складывать** параллельные/вложенные фазы как общую длительность.
- `runet_blackbox_report_timestamp_seconds{target}` — privacy-rounded timestamp для контроля устаревания.

Файл записан с `0600`: node_exporter должен работать от того же user либо файл нужно перенести/выдать ограниченные права подходящей группе. Округление времени 15 минут должно учитываться в stale alert; например, порог 30 минут при расписании 5 минут. Target labels увеличивают cardinality: ограничьте конфиг стабильным набором.

JUnit не содержит выдуманного elapsed suite time. В `system-out` только канонический report; XML-метасимволы экранируются. Все checks batch завершаются до формирования экспорта.

## Утилиты репозитория

```bash
node scripts/validate-report.mjs examples/reports/ok.example.json
node scripts/import-issue.mjs --body-file out/issue.md --out out/reports --result-file out/import-result.json
node scripts/aggregate.mjs out/reports out/aggregates 24
npm run build:web
```

- `validate-report`: один report, не bundle; канонизация и safe validation, exit 1 при отказе, 2 при отсутствии имени файла.
- `import-issue`: `--body-file` или `--github-event`; необязательные `--out`, `--summary-file`, `--result-file`. До 32 reports и 256 KiB issue body; GitHub event до 2 MiB. Частичный bundle импортирует только валидные записи и сообщает `partial`; полностью отклонённый — exit 1.
- `aggregate`: JSONL, single report JSON или CLI bundle JSON; default paths `data/reports`, `data/aggregates`, окно 24 часа. Окно >0 и ≤8760 часов. Лимиты: shard ≤32 MiB, ≤100000 parsed reports. Malformed JSON останавливает публикацию, schema-invalid reports отражаются в excluded counter.
- `schema`: `npm run schema` обновляет snapshot контракта, `npm run check` проверяет drift.

## Диагнозы и scope

Основные категории: `ok`, `dns_*`, `tcp_*`, `tls_reset`, `tls_timeout`, `tls_certificate_mismatch`, `http_error`, `http_timeout`, `http_reset`, `http_blockpage_suspected`, `http_unexpected_redirect`, `local_network_problem_possible`, `measurement_error`, `insufficient_data`.

Legacy labels про DPI/global outage принимаются схемой для совместимости, но новые отчёты не приписывают такой cause одному timeout/reset. `confidence` — эвристическая сила правила, не вероятность в статистическом смысле. QUIC/HTTP3 и browser rendering не выполняются.
