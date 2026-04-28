# Участие / Contributing

## Хорошие первые задачи

- Добавить unit tests для diagnosis categories.
- Улучшить blockpage fingerprints без хранения page bodies.
- Добавить dashboard filters.
- Улучшить или обсудить target packs в `packs/*.json`.
- Улучшить docs и translations.
- Отправить sanitized measurements через issue form.

English: good first contributions are tests, privacy-safe diagnosis improvements, dashboard filters, docs, and sanitized measurement reports.

## Разработка

```bash
npm ci
npm test
npm run check
node cli/bin/runet-blackbox.js sample --pretty
node cli/bin/runet-blackbox.js check example.com --no-http
node cli/bin/runet-blackbox.js check --pack baseline --no-http
```

## Требования к отчётам

- Используй официальный CLI, если возможно.
- Держи регион грубым: `Moscow`, `Tatarstan`, `Krasnodar Krai`.
- Не добавляй точный адрес, account IDs, phone numbers или private URLs.
- Для одиночной цели отправляй один report. Для pack можно отправлять один CLI-generated JSON bundle.
- Если использовался VPN/proxy/tun, явно укажи это и не называй отчёт обычной сетью провайдера.

## Code Style

- Без runtime dependencies, если они не убирают существенную сложность.
- Предпочитай deterministic pure functions для classification и aggregation.
- Держи network checks тестируемыми через local mock servers или injectable functions.
- Добавляй tests для каждого изменения diagnosis или privacy rule.
