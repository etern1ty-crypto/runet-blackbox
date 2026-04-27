# Руководство волонтёра / Volunteer Guide

Используй этот документ для первых публичных измерений.

English: use this guide to collect safe, privacy-preserving measurements from networks you are allowed to test.

## Безопасный сбор

1. Используй свою сеть или сеть, где тебе разрешены обычные connectivity checks.
2. Не используй украденные, leaked или сомнительные proxy.
3. Не пытайся обходить фильтрацию.
4. Не запускай частые циклы и не нагружай чужие сервисы.
5. Отправляй только sanitized JSON из CLI.
6. Если включён VPN/proxy/tun, не называй отчёт `no-vpn` и не выдавай его за обычную сеть провайдера.

## Рекомендуемая команда

Linux/macOS:

```bash
node cli/bin/runet-blackbox.js check github.com \
  --region Moscow \
  --provider Rostelecom \
  --asn AS12389 \
  --connection-type home \
  --json --pretty \
  --output report.json
```

Windows PowerShell:

```powershell
node .\cli\bin\runet-blackbox.js check github.com `
  --region Moscow `
  --provider Rostelecom `
  --asn AS12389 `
  --connection-type home `
  --json --pretty `
  --output .\report.json
```

Проверка:

```bash
node scripts/validate-report.mjs report.json
```

Windows:

```powershell
node .\scripts\validate-report.mjs .\report.json
```

Затем открой GitHub issue **Measurement report** и вставь JSON.

## Сравнение DNS

По умолчанию используется системный резолвер ОС. Если Windows показывает DNS `ECONNREFUSED` или нужно сравнение, можно явно указать DNS:

```powershell
node .\cli\bin\runet-blackbox.js check github.com `
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
