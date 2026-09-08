# Приватность и модель угроз

## Минимизация, не анонимность

CLI ничего не отправляет центральному сервису автоматически. Но probe видят DNS resolver, целевой сервер, провайдер и другие наблюдатели сети. Домен, время и coarse network context могут коррелироваться с пользователем. «Privacy-first» не означает анонимность, безопасность в любой юрисдикции или математическую невозможность утечки.

## Что сохраняется

- Канонический публичный target hostname/IP, schema/tool versions, content ID.
- Timestamp, округлённый вниз до 15 минут. Bundle generated_at тоже округлён.
- Добровольные country/region/provider/ASN/connection type.
- Один эвристический VPN/tunnel boolean, без interface names/addresses.
- Status, rounded latency, port, TLS protocol/ALPN/authorized, HTTP status, bounded sample length/truncation, SHA-256 sample при наличии.
- Primary/comparison resolver **labels**, не IP resolver.
- Пересчитанный diagnosis и короткие signals, создаваемые кодом.

Текущий HTTP probe не публикует headers hash. Для совместимости валидный исторический `headers_hash` допускается контрактом. Невалидные фиктивные строки вроде `sample`/`abc` удаляются.

## Что исключается

Raw DNS answers и pinned addresses, source/client IP, OS interface details, headers/cookies, response bodies, certificate subjects/issuers, raw authorization errors, URLs с credentials/query, произвольные debug fields и top-level metadata.

Sanitizer использует allowlist. Сырые OS error messages не печатаются: они могут включать paths/IP. Public import summaries не отражают в ошибке присланный JSON/токены.

Свободные `region`/`provider` ограничены, очищаются от управляющих символов и распространённых IP/email/URL/token patterns. **Любой произвольный секрет, замаскированный под обычное имя, автоматически распознать нельзя.** Вводите только крупный регион и обобщённый network label; перед внешней публикацией требуется human review всего документа.

## Network boundary

| Угроза | Контроль |
| --- | --- |
| Loopback/private/reserved literal, альтернативная запись IPv6 | Numeric subnet policy, canonical target validation |
| DNS rebinding / public hostname → private IP | Проверка всех A/AAAA до transport и закрепление выбранного literal |
| Redirect на metadata/local/private endpoint | Повторная host/IP validation, запрет credentials/нестандартных ports/не-HTTP(S) схем |
| TLS interception, expired/self-signed/hostname mismatch | `rejectUnauthorized: true`, проверка trust и identity, минимум TLS 1.2 |
| HTTPS downgrade | Запрет перехода HTTPS → HTTP |
| Infinite redirect / slow drip / huge response | Total HTTP deadline, cap redirects/body/headers, destroy request/response |
| Raw data leakage | Allowlist, нормализованные error codes, минимальные labels |
| Forged diagnosis or report ID | Полный пересчёт перед записью/агрегацией |
| Duplicate/racing imports | Content hash, lock, atomic shard replacement, общая Actions concurrency group |
| Anonymous mass publication | Maintainer approval label; никакого автоматического доверия к title |
| Synthetic data mistaken for live availability | Только `?demo=1`, явные отметки на dashboard/SVG |

IPv6 policy намеренно консервативна: только обычный global-unicast `2000::/3` минус специальные диапазоны. Mapped/compatible IPv4, NAT64 и transition-addresses отклоняются, даже когда embedded IPv4 мог бы быть public. Обновляйте политику по изменениям registries; это не универсальный IP-routing oracle. Системные маршруты/VPN могут направить публичный IP иначе, чем ожидается; OS-level egress allowlist остаётся отдельным контролем.

## Ограничения доверия

- Нет криптографической аттестации, Sybil resistance и доказательства независимых reporters.
- Hash не подтверждает честность измерения. Автор может сфабриковать statuses или expectations.
- Нельзя заключить «DPI виновен» или «глобальный outage» по одному reset/timeout.
- Blockpage heuristic намеренно узкая; возможны false positives/negatives. Не является юридическим доказательством.
- Полноценный HTTP body не скачивается; browser JS, service-worker, login flow, HTTP/3 не тестируются.
- Архитектура one-shot CLI, а не multi-tenant API. **Не оборачивайте internal probes в публичный arbitrary-target API без отдельной модели угроз и rate/auth/egress controls.**
- Файловая система, `PATH`, Node runtime, CA trust store, внутренние DI adapters и repository maintainer считаются доверенными.
- Approval публичного issue не переносит разрешение на публикацию иных частных документов/логов.

## Сообщение об уязвимости

См. [SECURITY.md](../SECURITY.md). Не публикуйте рабочие credentials, реальные private targets, сырые headers/body и клиентские IP. Для repro используйте localhost mock server и публичные test fixtures.
