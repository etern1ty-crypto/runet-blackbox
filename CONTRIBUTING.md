# Contributing

Спасибо за помощь в создании маленького, проверяемого инструмента диагностики. Предпочтение — ясные локальные измерения, минимум данных и воспроизводимые tests.

## Разработка

```bash
npm ci --ignore-scripts --no-audit
npm run check
npm run test:coverage
```

Node 22+/24, JavaScript ESM, встроенный node:test. Не добавляйте npm-пакет без явного выигрыша и обновления documented dependency policy. `scripts/check-project.mjs` намеренно требует review этого решения.

## Требования к PR

- Воспроизведение дефекта и regression test. Network tests только на локальных серверах/DI, не внешних targets.
- Для нового поля обновите `src/report-fields.js`, allowlist sanitizer, schema snapshot (`npm run schema`), документацию и migration notes.
- Не публикуйте raw headers/body/DNS/client IP/credentials. Для vulnerability используйте [SECURITY.md](SECURITY.md).
- Все asynchronous operations должны завершаться, закрывать ресурсы и учитывать abort/deadline.
- Не приписывайте cause сетевого сбоя данным, которые этого не доказывают.
- Изменения CLI flags должны отражаться в help, config, README примерах и тестах.
- UI должен оставаться доступным с клавиатуры, без overflow на 390px, со честным empty/error/demo state.

Нет формального CLA в исходной лицензии. Сохраняйте MIT notice; не добавляйте сторонний код с несовместимой лицензией. Submitter должен иметь право передавать вклад.

См. [архитектуру](docs/ARCHITECTURE.md), [testing](docs/TESTING.md) и [roadmap](ROADMAP.md).
