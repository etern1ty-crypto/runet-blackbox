# Руководство волонтёра / Volunteer Guide

Используй этот документ для первых публичных измерений.

English: use this guide to collect safe, privacy-preserving measurements from networks you are allowed to test.

## Безопасный сбор

1. Используй свою сеть или сеть, где тебе разрешены обычные connectivity checks.
2. Не используй украденные, leaked или сомнительные proxy.
3. Не пытайся обходить фильтрацию.
4. Не запускай частые циклы и не нагружай чужие сервисы.
5. Отправляй только sanitized JSON из CLI.
6. Если включён VPN/proxy/tun, не называй отчёт `no-vpn` и не выдавай его за обычную сеть провайдера. CLI предупредит локально и добавит только безопасный boolean-маркер без деталей интерфейсов.

## Рекомендуемая команда

Linux/macOS:

```bash
npx runet-blackbox doctor
npx runet-blackbox check github.com \
  --region Moscow \
  --provider Rostelecom \
  --asn AS12389 \
  --connection-type home \
  --issue-url
```

Windows PowerShell:

```powershell
npx runet-blackbox doctor
npx runet-blackbox check github.com `
  --region Moscow `
  --provider Rostelecom `
  --asn AS12389 `
  --connection-type home `
  --issue-url
```

`--issue-url` печатает ссылку на prefilled GitHub issue для одиночной цели. Если хочешь сначала сохранить JSON локально:

```bash
npx runet-blackbox check github.com \
  --region Moscow \
  --provider Rostelecom \
  --json --pretty \
  --output report.json
```

Если работаешь из checkout, можно провалидировать файл:

```bash
node scripts/validate-report.mjs report.json
```

Затем открой GitHub issue **Measurement report** и вставь JSON.

Можно подготовить текст issue автоматически:

```bash
npx runet-blackbox check github.com \
  --region Moscow \
  --provider Rostelecom \
  --json --pretty \
  --issue-file report.issue.md
```

Или попробовать clipboard:

```bash
npx runet-blackbox check github.com --json --pretty --copy-issue
```

## Pack-измерение

Для кампании “First 50 Reports” лучше использовать маленькие готовые packs:

```bash
npx runet-blackbox packs
npx runet-blackbox check --pack dev \
  --region Moscow \
  --provider Rostelecom \
  --connection-type home \
  --issue-file dev.issue.md
```

Pack issue содержит JSON bundle. GitHub Actions импортирует его как несколько отдельных sanitized reports.

## Сравнение DNS

По умолчанию используется системный резолвер ОС. Если Windows показывает DNS `ECONNREFUSED` или нужно сравнение, можно явно указать DNS:

```powershell
npx runet-blackbox check github.com `
  --region Moscow `
  --provider Rostelecom `
  --asn AS12389 `
  --dns 8.8.8.8 `
  --json --pretty `
  --output .\report-dns-google.json
```

`--dns` и `--dns-server` одинаковы. Это диагностическое сравнение, не обход.

## Регион

Используй грубые метки:

- `Moscow`
- `Saint Petersburg`
- `Tatarstan`
- `Krasnodar Krai`
- `Novosibirsk Oblast`

Не указывай улицу, дом, офис, GPS, ЖК, Wi-Fi name или другую точную привязку.

## Первый набор целей

Начни с малого:

- `github.com`
- `npmjs.com`
- `registry.npmjs.org`
- `docker.com`
- `hub.docker.com`
- `stackoverflow.com`
- `cloudflare.com`
- `example.com`

`example.com` полезен как низкорисковый healthy control.
