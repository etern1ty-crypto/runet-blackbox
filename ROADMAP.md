# Roadmap

## Реализовано в 0.4.0

- [x] Dependency preflight, строгий JSON config и CI pack.
- [x] Public IP pinning, TLS verification, безопасные redirects и bounded HTTP.
- [x] JSON / JUnit / Prometheus artifacts, worker pool, graceful shutdown.
- [x] Allowlist, canonical diagnosis/IDs, locked import, rolling-window aggregates.
- [x] Explicit demo, deployment build, документация и regression suite.

## Следующий продуктовый этап — гипотезы, не обещания

- [ ] Пилоты на реальных self-hosted runner’ах; оценка полезности и noise rate.
- [ ] Проверяемое сравнение нескольких адресов/IPv4/IPv6 без потери provenance.
- [ ] Отдельная endpoint-модель с safe paths и специальным privacy/security review.
- [ ] Поддержка ticket integrations, если подтверждена потребность покупателей.
- [ ] Private control plane, RBAC, retention и attestations только после PMF-сигналов.
- [ ] Immutable action/image pins и подписанные release artifacts в процессе владельца.

Не входят в реализованный scope: VPN/proxy/bypass, нагрузочные тесты, QUIC/HTTP3, browser E2E, arbitrary private-target API, биллинг, multi-tenant SaaS.
