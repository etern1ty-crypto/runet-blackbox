# Threat Model / Модель угроз

## Assets / Что защищаем

- Приватность contributors.
- Целостность публичных measurements.
- Доверие к aggregated status.
- Maintainability репозитория.

## Adversaries / Риски

- Spam reporters с fabricated data.
- Automated bots, flood issue forms.
- Middleboxes, меняющие поведение при известных probes.
- Добросовестные users, случайно публикующие sensitive details.

## Controls in v1

- Strict schema validation.
- Sanitization before storage.
- No raw IP/body/header storage.
- Deduplication by stable report hash.
- Deterministic aggregation from committed data.
- Local/private/reserved target rejection.
- Size limit for issue-imported reports.
- Russian-first issue templates with explicit privacy confirmations.

## Known gaps

- No Sybil resistance.
- No independent server-side validation.
- No cryptographic attestation from measurement clients.
- No signed releases yet.
- GitHub issue submissions всё ещё могут содержать private prose вне JSON, если пользователь игнорирует инструкции.

Эти ограничения приемлемы для первого public MVP: цель проекта — прозрачные community evidence, а не legal-grade measurement oracle.
