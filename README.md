# Runet Blackbox

[![validate](https://github.com/etern1ty-crypto/runet-blackbox/actions/workflows/validate.yml/badge.svg)](https://github.com/etern1ty-crypto/runet-blackbox/actions/workflows/validate.yml)
[![pages](https://github.com/etern1ty-crypto/runet-blackbox/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/etern1ty-crypto/runet-blackbox/actions/workflows/deploy-pages.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Открытая диагностика нестабильных сетей.**

**Open network observability for unstable networks.**

**Концепт:** сетевая метеосводка для разработчиков. Один запуск показывает, где ломается доступ к GitHub, npm, Docker, AI-сервисам или социальным платформам: DNS, TCP, TLS, HTTP, провайдер, регион или сам сервис.

**Concept:** Network Weather for developer infrastructure. One command to see where access breaks, one sanitized report to help others compare symptoms.

Runet Blackbox отвечает на практический вопрос:

> Сервис не открывается из этой сети. Это похоже на DNS-сбой, TCP timeout, TLS reset, HTTP blockpage, деградацию провайдера, локальную проблему или возможный сбой самого сервиса?

Это не VPN, не proxy, не bypass guide и не инструмент обхода ограничений. Проект только измеряет, классифицирует, очищает и агрегирует публичные свидетельства.

## Быстрый старт за 60 секунд

Требования: Node.js `22+`. Runtime-зависимостей нет.

Linux/macOS:

```bash
npx runet-blackbox check github.com --region Moscow --provider Rostelecom --copy-issue
npx runet-blackbox check --pack dev --region Moscow --provider Rostelecom --copy-issue
```

Windows PowerShell:

```powershell
npx runet-blackbox check github.com --region Moscow --provider Rostelecom --copy-issue
npx runet-blackbox check --pack dev --region Moscow --provider Rostelecom --copy-issue
```

Создать публичный JSON-отчёт:

```bash
npx runet-blackbox check github.com \
  --region Moscow \
  --provider Rostelecom \
  --asn AS12389 \
  --connection-type home \
  --json --pretty \
  --output report.json
```

Если работаешь из checkout, можно отдельно провалидировать файл перед отправкой:

```bash
node scripts/validate-report.mjs report.json
```

Отправка: открой GitHub issue по шаблону **Measurement report** и вставь JSON.

Быстрее: CLI может сам подготовить issue body:

```bash
npx runet-blackbox check github.com \
  --region Moscow \
  --provider Rostelecom \
  --json --pretty \
  --issue-file report.issue.md
```

Если clipboard доступен:

```bash
npx runet-blackbox check github.com --json --pretty --copy-issue
```

Проверить готовый набор целей:

```bash
npx runet-blackbox packs
npx runet-blackbox check --pack dev --region Moscow --provider Rostelecom --copy-issue
npx runet-blackbox check --pack ai --region Moscow --provider MTS --issue-file ai.issue.md
```

Доступные packs: `dev`, `ai`, `social`, `cloud`, `baseline`.

Для разработки и тестов из исходников:

```bash
git clone https://github.com/etern1ty-crypto/runet-blackbox.git
cd runet-blackbox
npm ci
npm run check
node cli/bin/runet-blackbox.js check github.com --region Moscow --provider Rostelecom
```

## Windows DNS

По умолчанию CLI использует системный резолвер ОС. На Windows это важно: `dns.promises.Resolver()` может попасть в DNS виртуального/tun адаптера и получить `ECONNREFUSED`, хотя обычный системный резолвинг работает.

Для сравнения можно явно указать DNS:

```powershell
npx runet-blackbox check github.com `
  --region Moscow `
  --provider Rostelecom `
  --asn AS12389 `
  --dns 8.8.8.8 `
  --json --pretty
```

`--dns` и `--dns-server` эквивалентны. Это не обход блокировок, а диагностическое сравнение резолверов.

Если включён VPN/proxy/tun, не публикуй отчёт как обычную домашнюю сеть. CLI локально предупреждает о похожих интерфейсах и публикует только безопасный boolean-маркер `environment.suspected_vpn_or_tunnel`, без имён интерфейсов, IP или конфигов.

На Windows предпочитай `--output report.json` вместо `Out-File`: так файл пишет Node.js без BOM. Валидатор BOM принимает, но `--output` чище.

## What This Is

Runet Blackbox is a privacy-first measurement toolkit for unstable networks. It runs conservative DNS/TCP/TLS/HTTP checks, produces a sanitized JSON report, and aggregates community evidence through GitHub.

It is not a circumvention tool. It does not proxy traffic, tunnel connections, store packet captures, or collect exact user location.

See [Positioning](docs/positioning.md) for “why not another OONI?” and project boundaries.

## Что делает CLI

Для одной цели CLI выполняет цепочку:

- DNS `A`/`AAAA` через системный резолвер или явно заданный `--dns`;
- TCP connect к `80` и `443`;
- TLS handshake с SNI на `443`;
- HTTPS request, если TLS успешен;
- детерминированный диагноз с confidence и signals;
- privacy sanitizer перед JSON-выводом.

Для pack CLI последовательно проверяет несколько целей и формирует JSON bundle, который GitHub Actions импортирует как набор отдельных sanitized reports.

Пример human-readable вывода:

```text
Измерение Runet Blackbox

Цель:       github.com
Report ID:  rbb_...
Локация:    RU/Moscow
Сеть:       Rostelecom AS12389 (home)
Диагноз:    Доступно [ok]
Confidence: 94%
Summary:    Измеренный путь завершился успешно.
```

## Что публикуется

Публичные отчёты намеренно содержат меньше данных, чем CLI видит локально.

Хранится:

- target domain или публичный IP;
- грубая страна и регион;
- provider label и optional ASN;
- connection type category;
- безопасный маркер `suspected_vpn_or_tunnel`, если локально замечена VPN/tun/proxy-похожая среда;
- timestamp, округлённый до 15 минут;
- статусы проверок и грубая latency;
- diagnosis category, confidence и короткие signals.

Не хранится:

- IP пользователя;
- точная локация;
- raw DNS answers;
- HTTP headers;
- cookies;
- response bodies;
- packet captures;
- traceroute hops;
- credentials или private URLs.

Подробности: [Privacy](docs/privacy.md), [Methodology](docs/methodology.md), [Threat Model](docs/threat-model.md).

## Поток отчёта

1. Волонтёр запускает CLI локально.
2. CLI печатает локальный диагноз и sanitized JSON.
3. Волонтёр открывает GitHub measurement issue и вставляет JSON.
4. GitHub Actions валидирует и санитизирует отчёт ещё раз.
5. Принятые отчёты сохраняются в `data/reports/*.jsonl`.
6. Агрегаты пересобираются в `data/aggregates`.
7. Генерируются safe SVG cards в `data/aggregates/cards` и weekly digest в `data/digests/YYYY-WW.md`.
8. GitHub Pages показывает статический dashboard “Network Weather” с target detail и timeline.

В текущей архитектуре нет центрального сервера.

## Команды

```bash
node cli/bin/runet-blackbox.js help
node cli/bin/runet-blackbox.js version
node cli/bin/runet-blackbox.js sample --pretty
node cli/bin/runet-blackbox.js check example.com --no-http
node cli/bin/runet-blackbox.js packs
node cli/bin/runet-blackbox.js check --pack dev --copy-issue
node cli/bin/runet-blackbox.js check github.com --dns 8.8.8.8 --json --pretty
node cli/bin/runet-blackbox.js check github.com --json --pretty --issue-file report.issue.md
node scripts/aggregate.mjs
npm run check
```

Коды выхода:

- `0`: измерение завершено;
- `2`: измерение завершено и `--fail-on-degraded` нашёл деградацию;
- `64`: ошибка аргументов CLI;
- `70`: внутренняя ошибка.

## Структура

```text
apps/web/                  Static GitHub Pages dashboard
cli/                       User-facing measurement CLI
data/reports/              Sanitized accepted JSONL reports
data/aggregates/           Generated dashboard data
data/digests/              Generated weekly Network Weather digests
docs/                      Methodology, privacy, volunteer docs
examples/                  Safe example inputs and reports
packs/                     Curated target packs: dev, ai, social, cloud, baseline
schemas/report.schema.json Machine-readable report schema
scripts/                   Import, validation, aggregation, CI helpers
src/                       Shared report, diagnosis, privacy, aggregation logic
test/                      Unit and integration tests
```

## Разработка

```bash
npm ci
npm run check
npm test
npm run aggregate
```

Проект намеренно остаётся zero-dependency. Новые зависимости допустимы только если они заметно упрощают код и не ухудшают аудит публичного measurement path.

## Как помочь

Начни с [CONTRIBUTING.md](CONTRIBUTING.md). Хорошие первые задачи:

- собрать реальные отчёты от разных провайдеров и регионов;
- предложить изменения target packs через PR;
- улучшить tests для diagnosis edge cases;
- добавить консервативные blockpage fingerprints без хранения body;
- улучшить dashboard filtering;
- перевести и вычитать docs.

## Release Status

Current release: `v0.2.0`, first npm/npx release with target packs and Network Weather bundles.

See [CHANGELOG.md](CHANGELOG.md), [ROADMAP.md](ROADMAP.md), and [docs/release-checklist.md](docs/release-checklist.md).

## npx

Основной быстрый путь через npm:

```bash
npx runet-blackbox check github.com --region Moscow --provider Rostelecom --copy-issue
npx runet-blackbox check --pack dev --region Moscow --provider Rostelecom --copy-issue
```
