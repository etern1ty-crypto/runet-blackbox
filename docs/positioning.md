# Позиционирование / Positioning

## Короткая формулировка

Runet Blackbox — privacy-first “чёрный ящик” для быстрого ответа на вопрос: где ломается доступ — DNS, TCP, TLS, HTTP, провайдер, локальная сеть или сам сервис.

English: a lightweight privacy-first triage layer for unstable networks.

## Почему не “ещё один OONI”

Runet Blackbox не конкурирует с крупными измерительными платформами.

- OONI хорош для глобальных censorship measurements и research datasets.
- RIPE Atlas хорош для distributed connectivity measurements через probes/anchors.
- IODA хорош для macro-level outage detection.
- Censored Planet хорош для крупномасштабного мониторинга interference.

Runet Blackbox занимает другой слой: локальный triage для обычного пользователя и русскоязычных сетей, где важны низкий порог входа, понятный диагноз, GitHub-native отчёты и минимальный сбор данных.

## Что делает проект сильным

- Не требует центрального сервера.
- Не проксирует трафик и не помогает обходить ограничения.
- Публикует только sanitized JSON.
- Объясняет diagnosis через confidence и signals.
- Показывает ограничения данных через credibility labels.

## Что должно появиться следующим

- 30-50 первых реальных безопасных отчётов.
- npm package для `npx runet-blackbox ...`.
- Signed release artifacts и checksums.
- Multi-resolver DNS comparison как first-class report field.
- Более явные “signals for / signals against” в diagnosis explanations.
