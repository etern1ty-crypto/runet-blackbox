# Contributing / Участие

Runet Blackbox — observability-проект. Держи вклад в границах measurement, diagnosis, privacy и воспроизводимых публичных свидетельств.

English: keep contributions focused on measurement, diagnosis, privacy, and reproducible public evidence.

## Правила

- Не добавляй VPN, proxy, bypass, tunneling или circumvention features.
- Не коммить secrets, tokens, cookies, private logs, packet captures или raw user telemetry.
- Если privacy конфликтует с детализацией статистики, выбирай меньше данных.
- Не нагружай чужие сервисы. Проверки должны быть лёгкими.
- На каждое изменение поведения добавляй или обновляй tests.

## Разработка

```bash
npm ci
npm run check
npm test
node cli/bin/runet-blackbox.js sample --pretty
node cli/bin/runet-blackbox.js check example.com --no-http
```

## Measurement Reports

Используй официальный CLI:

```bash
node cli/bin/runet-blackbox.js check github.com \
  --region Moscow \
  --provider Rostelecom \
  --connection-type home \
  --json --pretty \
  --output report.json
```

Windows PowerShell:

```powershell
node .\cli\bin\runet-blackbox.js check github.com `
  --region Moscow `
  --provider Rostelecom `
  --connection-type home `
  --json --pretty `
  --output .\report.json
```

Перед отправкой:

- используй грубый регион, не адрес;
- не вставляй IP, account IDs или private URLs в issue text;
- проверяй JSON: `node scripts/validate-report.mjs report.json`;
- отправляй одну цель на один issue;
- если включён VPN/proxy/tun, явно укажи это и не называй отчёт обычной сетью провайдера.

## Code Style

- Используй plain Node.js APIs, если зависимость не даёт явной пользы.
- Держи public JSON стабильным внутри schema version.
- Делай network logic тестируемой через local mock servers или injectable functions.
- Предпочитай deterministic pure functions для diagnosis, privacy и aggregation.
