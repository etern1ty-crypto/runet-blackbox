# Архитектура и внутреннее устройство

## Принципы

1. **Local first.** Измерение и экспорт не требуют сервера; публикация — отдельный, необязательный workflow.
2. **Не менять измеряемый путь.** Primary DNS определяет адрес. Сравнительные резолверы не становятся fallback для транспортных probes.
3. **Fail closed.** Любой private/reserved-ответ в DNS-наборе прекращает транспортную часть проверки. Redirect policy проверяется на каждом переходе.
4. **Наблюдение отдельно от утверждения.** Diagnosis описывает слой сбоя, но не объявляет виновного провайдера/DPI.
5. **Меньше данных.** Публичный отчёт строится из allowlist, а не из «исходных данных минус список известных секретов».

## Слои

| Слой | Модули | Ответственность |
| --- | --- | --- |
| Вход | `cli/internal/args.js`, `config.js`, `packs.js` | Парсинг, строгие лимиты, выбор целей, precedence |
| Оркестрация | `main.js`, `batch.js`, `checks/run.js` | Worker pool, отмена, последовательность фаз, exit codes |
| Transport | `checks/dns.js`, `tcp.js`, `tls.js`, `http.js`, `util.js` | DNS, pinning, TLS trust, deadlines, закрытие ресурсов |
| Domain model | `src/report*.js`, `report-fields.js`, `diagnosis*.js` | Контракт, канонизация, explanation, content ID |
| Privacy/policy | `src/privacy.js`, `target-policy.js`, `target.js`, `time.js` | Allowlist, публичные адреса, нормализация, округление |
| Экспорт | `output.js`, `exports.js`, `bundle.js`, `submit.js` | Атомарные файлы, JSON/JUnit/Prometheus, добровольный share |
| Публикация | `scripts/import-issue.mjs`, `scripts/lib/store.mjs` | Проверка event snapshot, сериализация записи, dedup |
| Представление | `src/aggregate.js`, `digest.js`, `share-card.js`, `apps/web/` | Окно, unknown/VPN separation, статический dashboard |

Node built-ins — весь runtime. Никаких Express, React, ORM, базы данных, npm dependency tree или скрытого API-сервера. Dashboard не может выполнить TCP/TLS probe из браузера; он только отображает агрегаты.

## Последовательность одной цели

```mermaid
sequenceDiagram
    participant CLI
    participant Policy
    participant DNS
    participant Transport
    participant Report
    CLI->>Policy: hostname / HTTPS origin root
    Policy-->>CLI: validated canonical target
    CLI->>DNS: primary lookup (+ optional comparisons)
    DNS-->>CLI: count + vetted in-memory addresses
    Note over CLI,DNS: Any unsafe answer stops subsequent probes
    CLI->>Transport: pin first vetted address
    Transport->>Transport: TCP/80 and TCP/443 concurrently
    Transport->>Transport: TLS/443 with certificate and name verification
    Transport->>Transport: bounded HTTPS; validate every redirect
    Transport-->>Report: structured results
    Report->>Report: allowlist → classify → validate → hash
    Report-->>CLI: canonical sanitized report
```

По умолчанию OS lookup сохраняет семантику локального системного resolver/hosts и отдаёт IPv4-first. Явный `--dns` использует cancellable c-ares `Resolver`, запросы A и AAAA. Если хотя бы одна семья вернула адреса, они проверяются политикой; ошибки второй семьи не создают фиктивную доступность второй семьи.

Список адресов — non-enumerable свойство внутреннего результата DNS. JSON.stringify не включает его. `runCheck` берёт первый проверенный адрес и передаёт literal в TCP/TLS и фиксированный lookup в HTTP. При редиректе на новый hostname его адреса также проверяются и закрепляются; повторное обращение к тому же hostname не выполняет новый DNS lookup.

**Ограничение:** измеряется один адрес, а не все IPv4/IPv6 маршруты. Нет Happy Eyeballs/fallback между адресами и нет вывода «все адреса сервиса недоступны».

## Ограничения ресурсов

- 1–32 цели; 1–4 параллельные цели, default 2.
- Фазы DNS / comparison / TCP / TLS / HTTP имеют бюджеты; TCP/80 и 443 параллельны, comparison resolvers параллельны.
- Default `timeoutMs=5000`. HTTP budget общий для всех redirects, DNS новых redirect-hosts и чтения тела.
- Default максимум 3 redirects (допустимо 0–5), 64 KiB sample, 16 KiB response headers.
- HTTP прекращает чтение на sample cap и выставляет `body_truncated=true`. Content length — прочитанный sample, не обещание полного размера страницы.
- Socket, response и request закрываются на success/failure/abort. Ранний close и response error обработаны.
- `dns.lookup` ОС нельзя отменить на уровне libuv. Возврат контролируется таймером; при сигнале entry point ограничивает оставшееся завершение процесса 1,5 секундами.

Нормальная верхняя оценка одной цели с DNS comparisons — около пяти фазовых бюджетов. Без comparisons — около четырёх. Это не SLA реального wall-clock времени: ОС и планировщик могут добавлять задержки.

## Контракт отчёта

`src/report-fields.js` — единый источник shape-контракта и allowlist полей. `scripts/generate-schema.mjs` генерирует JSON Schema; `--check` обнаруживает drift. `validateShape` реализует только используемое подмножество JSON Schema (type, const, enum, required, properties, additionalProperties, длины, диапазоны и items); это не универсальная JSON Schema библиотека. Семантика target и UTC-даты проверяется отдельно.

`prepareReport` — граница доверия для нового отчёта и любого импорта:

1. Явно копирует разрешённые поля; удаляет неизвестные поля и серверные identity/details.
2. Округляет UTC timestamp вниз до 15 минут; нормализует coarse labels.
3. Игнорирует присланные diagnosis/report_id и пересчитывает собственные.
4. Проверяет контракт; ошибки не публикуют исходный JSON.
5. Обновляет schema version до 1.1 и вычисляет `rbb_` + первые 20 hex SHA-256 канонического содержимого.

Content ID — dedup key, **не подпись**, не attestation и не доказательство честности автора. Разный latency может означать другой content ID; повторные измерения не считаются независимыми людьми.

## Отмена и запись

`runBatch` связывает внешний AbortSignal с внутренним controller. Ошибка worker отменяет siblings; все worker promises завершаются до выхода. Порядок результата совпадает с порядком целей, а не завершения.

Файлы появляются после завершения всех probes. Каждый файл записывается в временный файл той же директории, fsync + rename; permissions `0600` в POSIX. Атомарность относится **к одному файлу**: JSON/JUnit/Prometheus не образуют общую транзакцию. Ошибка диска может оставить уже записанный предыдущий артефакт — exit `70` нельзя игнорировать.

## Хранилище и агрегаты

JSONL shards по UTC-дням. Локальный `.import.lock` защищает read/dedup/write; при конкуренции ожидание ограничено. Stale lock не удаляется автоматически. В GitHub Actions writers имеют общую concurrency group; это не надёжная FIFO-очередь.

Агрегатор повторно канонизирует отчёты, убирает exact duplicates, future timestamps, записи вне окна и VPN-помеченные записи (default). `measurement_error`/`insufficient_data` считаются unknown, не degraded. Incident candidate требует минимум 3 degraded reports и большинства над OK+unknown. Ни threshold, ни confidence не являются статистически откалиброванной вероятностью.

Default dashboard window — 24 часа; weekly digest строится отдельно с понедельника UTC текущей ISO-недели. Build timestamp и время измерения различаются; dashboard предупреждает о снимке старше 2 часов. Демо не подставляется при ошибке загрузки реальных данных.
