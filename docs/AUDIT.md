# Аудит 0.3.1 → 0.4.0

## Объект и метод

Объект: пользовательский `runet-blackbox-main.zip`, исходная версия 0.3.1. Исходник сохранён отдельно от рабочей копии. Выполнены чтение всех runtime-модулей/скриптов, изучение UI/workflows/tests, локальный исходный прогон, отдельные негативные воспроизведения и регрессионные тесты после изменений.

**Исходный suite: 272 tests, 272 pass, 0 fail, 0 skip.** Это не доказательство отсутствия дефектов: описанные ниже пути в нём не проверялись либо старые assertions закрепляли прежнее поведение. Итоговый прогон — [VERIFICATION.md](VERIFICATION.md).

Строки в таблице относятся к **исходному архиву 0.3.1**, не к переформатированной версии 0.4.0. Для новой версии указаны модули/тесты, чтобы аудит не ломался при форматировании. P0/P1/P2 — приоритет исправления в данном инструменте, не внешняя CVSS-оценка.

## Реестр дефектов и исправлений

| ID / приоритет | Исходное место | Дефект и риск | Внедрённое исправление / проверка |
| --- | --- | --- | --- |
| A01 · P0 · security | `cli/internal/checks/http.js:20–60` | Redirect следует произвольному URL без проверки private host/IP, схемы, credentials, порта и downgrade. Возможен доступ к локальным сервисам из процесса probe | `safeUrl`, DNS validation каждого redirect-host, запрет private/reserved, credentials, custom ports, HTTPS downgrade; негативные redirect tests |
| A02 · P0 · security/logic | `cli/internal/checks/dns.js:43–80`; `cli/internal/checks/run.js:24–34`; `cli/internal/checks/tcp.js:9`; `cli/internal/checks/tls.js:12`; `cli/internal/checks/http.js:31` | Проверялось количество DNS-ответов, не их адреса; transport повторно резолвил hostname. `--dns` не определял фактический путь; public hostname мог направить probe внутрь сети | Все A/AAAA проверяются; любой unsafe ответ останавливает transport; один pinned literal используется TCP/TLS/HTTP; comparison не меняет путь |
| A03 · P0 · security | `src/target-policy.js:12–23,64–71` | IPv6 проверяется текстовыми префиксами; `::ffff:127.0.0.1`, expanded loopback и NAT64 проходили policy | Numeric IPv4/IPv6 subnet checks, консервативный global-unicast allowlist; репродукции обходов и expanded-форм |
| A04 · P1 · security | `cli/internal/checks/tls.js:11–40`; `cli/internal/checks/http.js:36` | `rejectUnauthorized:false`; TLS отмечал ошибку только для одного certificate code, expired/self-signed мог стать OK; HTTPS тоже отключал trust | TLS trust/identity/expiry проверяются, минимум TLS 1.2; local self-signed/expired/wrong-host tests; никакого небезопасного CLI override |
| A05 · P1 · availability | `cli/internal/checks/http.js:45–87` | Inactivity timeout можно продлевать slow-drip потоком; объём загрузки не ограничен, хотя hash sample усечён. Response errors/aborted не закрывали Promise, async redirect callback мог дать unhandled rejection | Total HTTP deadline, sample/header caps, немедленное закрытие на cap/redirect; response error/close/aborted; обычный await-loop redirects |
| A06 · P1 · logic | `cli/internal/checks/http.js:52–59,67–77` | 4xx/5xx и исчерпанный redirect limit считались OK; `unexpected_redirect` не производился этим путём | Default final 2xx, per-target expectations, loop/limit/location failures, HTTP error/timeout/reset categories |
| A07 · P1 · privacy | `src/privacy.js:41–83,86–101,145–155` | Denylist сохранял произвольные debug/token fields и неконтролируемые поля результатов; «sanitized» не означало reviewed shape | Allowlist на верхнем уровне и по probes; типизированный контракт; unknown fields удалены; canonical ingestion обязательна |
| A08 · P1 · privacy | `cli/internal/checks/dns.js:99–110`; `cli/internal/checks/tls.js:35–39`; `cli/internal/checks/util.js:5–9`; `cli/internal/bundle.js:7` | Публиковались resolver IP, certificate identity, произвольные OS error messages; bundle timestamp точнее обещанного | Resolver labels, отсутствие certificate CN/issuer, только error codes, rounded bundle time; redaction типичных IP/email/URL/token patterns в labels |
| A09 · P1 · data trust | `scripts/import-issue.mjs:40–60,93–108`; `src/aggregate.js:8–13` | Присланные diagnosis/report_id принимались как достоверные; ID мог подавлять чужую запись или обходить dedup | `prepareReport` пересчитывает diagnosis и content ID; sender claim не влияет на identity; tests forged IDs/claims |
| A10 · P1 · validation | `src/report-schema.js:89–127`; `schemas/report.schema.json:6,74–110` | JSON Schema и runtime validator расходились; статус-код, nested DNS comparisons, signals items, ports и extra fields проверялись неполно | Единый `report-fields.js`, generated schema snapshot + drift check; строгие nested types/ranges/lengths и UTC semantic validation |
| A11 · P1 · concurrency | `scripts/import-issue.mjs:93–109`; `.github/workflows/import-report.yml:11–13` | Read-check-append race; разные issues писали одни shards параллельно, отдельные concurrency groups не защищали store | Directory lock с deadline, canonical dedup, atomic shard replacement; общая workflow group; concurrent imports test |
| A12 · P1 · publication | `.github/workflows/import-report.yml:4–17` | Публичный title мог запускать bot import без human privacy review; unlimited fabricated reports не становились trustworthy от sanitizer | Import только после maintainer approval label; никакой автоотправки из CLI; общий review process и явные Sybil limitations |
| A13 · P1 · aggregation | `src/aggregate.js:6–18,99–121,261–266` | Exact duplicates раздували sample; все не-OK, включая недостаточные данные, считались degradation | Content dedup и separate unknown counter; no-data/inconclusive состояния; quality counters excluded |
| A14 · P1 · freshness | `src/aggregate.js:6–57`; `scripts/aggregate.mjs:12–17,50–53` | Вся история отображалась как текущая погода; weekly digest назывался недельным без недельного фильтра; stale domain/card files оставались | Default rolling 24h; ISO-week filter отдельно; future/outside-window counters; удаление obsolete generated cards/domains; stale banner |
| A15 · P1 · interpretation | `src/diagnosis.js:61–62,74–75`; `src/aggregate.js:199` | Два timeout в одной сети намекали на global outage, reset — на DPI; incident threshold требовал total≥3 вместо degraded≥3 | Cause-neutral TCP/TLS diagnoses, HTTP timeout/reset; минимум 3 degraded и большинство над OK+unknown; no statistical-confidence claim |
| A16 · P2 · correctness | `src/target-policy.js:48–60` | Слишком широкие IPv4 exclusions: 198.51/16, 203.0/16, 192.88/16 блокировали реальные публичные ranges; domain grammar не вызывалась | Точные CIDR scopes и обязательная проверка hostname; репродукции false rejection |
| A17 · P2 · CLI | `src/target.js:14–19,61–66,77–84`; `cli/internal/args.js:27–126` | Paths/ports могли теряться; невалидный ASN шёл как internal error; country fallback создавал выдуманный RU; type/multiple options не проверялись полно | Root-only CLI, strict config/args, error64, unknown ZZ, Decimal ASN, explicit target-source selection, no silent comparison truncation |
| A18 · P2 · resources | `cli/internal/checks/dns.js:64–67`; `cli/internal/checks/util.js:23–35`; `cli/bin/runet-blackbox.js` | DNS work после timeout не отменялся; отсутствовал coordinated shutdown | Cancellable explicit Resolver; cleanup-safe withTimeout; AbortSignal в probes/pool, SIGINT/SIGTERM, bounded process exit с оговоркой OS lookup |
| A19 · P2 · resources | `cli/internal/submit.js:73–79` | Clipboard child без deadline и stdin error handler мог зависнуть/упасть с EPIPE | Bounded child lifetime, stdin errors, abort, shell-free spawning; tests failing/hanging process |
| A20 · P2 · architecture/I/O | `cli/internal/main.js:54–121` | Дублирование single/batch orchestration, последовательные packs, plain output write мог оставить truncated file | Единый check plan + bounded worker pool + общие exporters; stable input order; atomic output; concurrent/signal/IO tests |
| A21 · P2 · UI | `apps/web/app.js:36–70` | `return response.json()` внутри try не ловил поздний parse rejection; пустой/сломанный real dataset заменялся демо | Await JSON внутри try, display schema validation, explicit `?demo=1`, различимые no-data/error/stale состояния |
| A22 · P2 · UI | `src/share-card.js:67–80`; `apps/web/styles.css` | Длинные diagnosis/credibility strings переполняли fixed-width SVG; mobile pills/layout были хрупкими; отсутствовала целостная keyboard/dark-mode проверка | Новый bounded SVG layout, text wrapping; responsive dashboard, focus states, accessible search/labels, dark mode, визуальная QA |
| A23 · P2 · CI/docs | `.github/workflows/import-report.yml:36–44`; `deploy-pages.yml:3–6`; `SECURITY.md` | `GITHUB_TOKEN` commit не запускал ожидаемый следующий push-workflow; нет freshness schedule; security support section устарел | Explicit workflow_run, hourly refresh, review/branch-protection caveats; Node22/24 × OS CI matrix; синхронизация metadata/docs |
| A24 · P2 · files/privacy | `scripts/lib/files.mjs:31–36`; `scripts/import-issue.mjs:78–90,123–134` | File discovery мог читать symlinks; parseArgs вне try; ошибки JSON могли отражать приватный фрагмент в summary; слабые value checks | Только regular files; protected parseArgs и bounded input; safe generic rejection summaries; source/result collision checks |

## Воспроизведения до исправления

`audit/baseline-findings.json` сохраняет локальные результаты отдельного отрицательного прогона:

- Все шесть выбранных unsafe/malformed inputs были приняты исходной policy.
- Три проверенных публичных адреса ошибочно отклонялись широкими диапазонами.
- `debug.token`/произвольный HTTP `note` сохранялись sanitizer’ом.
- Строковый HTTP status code и объект в `diagnosis.signals` проходили validator.
- Отчёт с DNS timeout и присланным category=ok агрегировался как ok.
- Три одинаковых отчёта считались тремя измерениями.
- Локальный HTTP 503 возвращал `status=ok` и общий diagnosis=ok.
- Redirect к второму loopback URL был реально выполнен исходным HTTP checker.

Все сетевые воспроизведения — на локальном mock server, без обращений к чужим внутренним ресурсам. Полный baseline test log и результаты финальных прогонов находятся в `audit/`.

## Недоделки и фиктивные данные

Поиск `TODO`, `FIXME`, `XXX`, `HACK`, пустых production-функций и `implement later` не обнаружил активных заглушек в исходном runtime. `placeholder` в HTML — атрибут input, не недописанный код; пустые test callbacks и `.gitkeep` также не production stubs.

Реальные функциональные пробелы: pack-only input вместо конфигурации команды, отсутствие CI exports и graceful shutdown, неиспользуемые diagnostic categories, неполная privacy/schema enforcement. Они реализованы/исправлены, а не оставлены рекомендациями.

`sample` и `data/demo` — намеренно синтетические данные. Fake hash values (`sample`, `abc`, `def`) не должны проходить как реальные SHA-256: sample перестал их выдавать, fixture hashes приведены к валидному формату. QUIC field/legacy categories оставлены для совместимости, **но QUIC probe не объявлен готовым**. Roadmap items не превращены в функции с фиктивным success.

## Ключи, зависимости и остаточные риски

В исходном runtime нет найденных hardcoded production tokens/keys. Spawn используется для локального clipboard без shell; это не eval. Тестовый TLS key новой версии специально публичен и описан в fixture README; в npm/Docker не включён.

Lockfile: ноль runtime/dev/transitive npm packages. Это сокращает поверхность dependency vulnerabilities, но не заменяет CVE-аудит Node/OpenSSL/OS/Actions/container. Нельзя честно заявить «все зависимости неуязвимы» по наличию пустого npm dependency tree.

Не устранены магически: отсутствие PMF-данных, Sybil resistance/attestation, некалиброванный confidence, непрерывный fleet monitoring, multi-address измерения, буквальная анонимность свободных labels, guaranteed FIFO GitHub Actions и неограниченный рост JSONL. Границы документированы и не маскируются фиктивной реализацией. Production rollout требует checklist из [DEPLOYMENT.md](DEPLOYMENT.md).

## Порядок исправления

1. Закрыть public/private boundary, TLS trust и bounded I/O (A01–A08, A16, A18).
2. Восстановить доверие к контракту и store (A09–A15, A24).
3. Реализовать нишевой workflow и exports (A17, A19–A20).
4. Обновить UI, documentation и CI с доказуемыми ограничениями (A21–A23).
5. Повторить unit/integration/packaging/browser QA и сформировать полный исходный deliverable.
