# Тестирование

## Основные команды

```bash
npm ci --ignore-scripts --no-audit
npm run check
npm run test:coverage
npm run release:check
```

`npm run check` проверяет syntax JS/ESM, drift JSON Schema, согласованность version/lockfile/CLI, относительные Markdown links и все `node:test` тесты. `lint` здесь означает проверку синтаксиса, **не** ESLint или полный анализ семантики. Типы входных контрактов проверяются в runtime; проект остаётся JavaScript ESM, а не выдаёт себя за TypeScript-кодовую базу.

Тесты используют локальные HTTP/TLS/TCP servers и dependency injection. Они не измеряют доступность внешних сервисов и не зависят от их статуса.

## Покрытые классы регрессий

| Suite | Что проверяет |
| --- | --- |
| `security-network.test.js` | IPv6/mapped/NAT64/metadata policy; mixed DNS; pinning; explicit DNS; redirects; TLS trust/hostname/expiry; slow drip; stream abort; body cap; cancellation |
| `preflight.test.js` | Config precedence/strictness; worker pool/order/drain; exit codes; JSON/JUnit/Prometheus; atomic output; clipboard timeout/EPIPE; реальная локальная цепочка TCP/TLS/HTTPS; POSIX SIGTERM |
| `ingestion-hardening.test.js` | Allowlist; forged diagnosis/IDs; schema types; даты; stale/future/VPN separation; dedup; concurrent imports; corrupt shard preservation; lock timeout; bundle aggregation |
| `web-data.test.js` | Отказ при malformed JSON/schema, fallback путей, безопасные numeric fields и отсутствие подмены реальных данных демо |
| Исходные suites | Target/ASN, time/hash, diagnosis, privacy, CLI, issue parser, reports, aggregates, SVG, BOM/file utilities |

Изменения старых assertions отражают явную миграцию поведения: localhost DNS теперь suspicious, HTTP test transport локален через DI при публичной logical origin, resolver IP заменён label, source claims не управляют агрегатами, старые fake hashes заменены валидными fixtures. Счётчик тестов не подменяет проверку сценариев.

## TLS fixtures

В `test/fixtures/tls/` лежит намеренно публичный test-only private key. Он не используется CLI и не попадает в npm package или Docker image. Сертификаты для `example.com`: обычный 2020–2040 и заведомо expired 2020–2021. Это не украденный ключ и не production credential. Не разворачивать его вне тестового сервера.

POSIX signal-test пропускается на Windows, где сигнал имеет иную семантику. CI matrix описывает Linux/Windows/macOS × Node 22/24; наличие matrix не означает, что все hosted jobs были запущены при подготовке архива.

## Ручная проверка вашей среды

```bash
node cli/bin/runet-blackbox.js doctor
node cli/bin/runet-blackbox.js preflight --config config.example.json --json --output out/pilot.json
node cli/bin/runet-blackbox.js check github.com --compare-dns 1.1.1.1 --json
```

Повторите из согласованных runner/office networks и оцените false positives. Не используйте успешный localhost suite как доказательство реальной доступности GitHub/npm/PyPI в интернете.

## Что ещё нужно перед промышленным rollout

Container build/scan в вашей инфраструктуре, hosted CI matrix, security patch status Node/ОС, реальные network pilots и аудит видимости artifacts. Фактические результаты поставленного прогона — [VERIFICATION.md](VERIFICATION.md), а не обещание отсутствия всех возможных ошибок.
