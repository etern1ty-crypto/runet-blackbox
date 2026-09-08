# Фактические результаты проверки

Поставленная ревизия: **0.4.0**. Проверка: **2026-09-08**. Это локальная проверка исходников и артефактов, не сертификация промышленного deployment.

## Среда

- Node.js **v24.14.1**, npm **11.11.0**, linux / x64.
- OpenSSL, предоставленный Node: `3.5.5`.
- Ноль npm runtime/dev/transitive dependencies.
- Исходный baseline: **272 tests / 272 pass / 0 fail**.

## Что действительно выполнено

| Проверка | Результат |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | Успешно; lockfile согласован |
| `npm run check` | **366 tests / 366 pass / 0 fail / 0 skipped / 0 cancelled** |
| Syntax check | 65 JS/ESM files; ошибок нет |
| Schema + project checks | Контракт не расходится с JSON Schema, versions/relative links/6 packs проверены |
| `npm run test:coverage` | Lines **91.90%**, branches **78.59%**, functions **88.73%** |
| `npm run validate:sample` | Валидный schema 1.1 sample |
| `npm run release:check` | Checks, sample, web build и pack dry-run успешны |
| `npm pack` + offline install в отдельный prefix | Binary `version`, `sample`, `doctor` выполнены; test key не входит в npm tarball |
| Local HTTP/TCP/TLS integration | Redirect/private-IP/expiry/hostname/body-cap/deadline/stream-close/abort scenarios проходят |
| Import/storage | Concurrent subprocess imports, content dedup, corrupt shard preservation, lock deadline и bundle aggregation проходят |
| Workflow YAML | 8 YAML файлов разобраны; это не запуск hosted Actions |
| Real aggregate | 0 reports, honest no-data, rolling 24h; данные не выдуманы |
| Synthetic aggregate | 9 synthetic reports / 3 targets, только opt-in demo |
| Browser QA | Desktop 1440px, mobile 390px, dark/reduced-motion, empty/error/demo, filters/selection, SVG variants; нет uncaught JS exceptions или horizontal overflow |

Coverage — отчёт встроенного Node runner по инструментированным файлам. Он не доказывает выполнение всех UI/workflow paths и не является автоматически enforced минимальным порогом для будущих PR.

## Свидетельства в исходном ZIP

- `audit/verification.json` — машиночитаемые результаты.
- `audit/final-check.log`, `audit/coverage.log`, `audit/release-check.log` — полные журналы прогонов.
- `audit/baseline-findings.json` — воспроизведения на исходной версии.
- `audit/browser-qa.json` и `audit/screenshots/` — состояния, assertions и изображения визуальной проверки.
- `delivery/CHANGE_MANIFEST.json` и `delivery/CHANGED_FILES_FULL.md` — состав изменений, SHA-256 и полный текст каждого изменённого/нового текстового файла.

Lean npm tarball содержит runtime и документацию. Полный набор audit/delivery evidence — в исходном ZIP, а не обязательно в npm tarball.

## Что не выполнено

- Не запускались Node 22, Windows/macOS и hosted GitHub Actions; для них подготовлена CI matrix.
- Docker build не выполнен: Docker отсутствует в среде. Dockerfile не считается проверенным image по одному чтению.
- Не проводились реальные customer-network / CI-runner pilots, load tests и независимый security audit.
- Не проверялись CVE всего Node/OpenSSL/OS/Actions supply chain; отсутствие npm dependencies не означает отсутствие уязвимостей платформы.
- Не выполнены npm publish, git push/tag, GitHub Release или Pages deployment.
- Не подтверждены PMF, размер рынка, готовность клиентов платить и коммерческий результат.

Перед production rollout пройдите [deployment checklist](DEPLOYMENT.md). Гарантия «устранены все возможные баги» была бы недостоверной; вместо неё поставлены конкретные исправления, регрессии и явные границы.
