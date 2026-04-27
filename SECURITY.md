# Security Policy / Политика безопасности

## Как сообщать о проблемах

Security или privacy issues лучше отправлять через GitHub private vulnerability reporting, если он доступен, или приватно maintainer'у до публичного issue.

English: report sensitive security or privacy issues privately when possible.

Не публикуй:

- working secrets или tokens;
- IP-адреса contributors;
- packet captures;
- private URLs;
- raw headers, cookies или response bodies.

## Поддерживаемые версии

`v0.1.x` получает security и privacy fixes.

## Граница проекта

Runet Blackbox — инструмент measurement и diagnostics. Он не предоставляет VPN, proxy, tunneling, traffic obfuscation или bypass functionality.

## Privacy-Sensitive Changes

Изменения, которые добавляют новые поля в отчёты, должны объяснять:

- зачем поле необходимо;
- может ли оно идентифицировать contributor'а;
- достаточно ли aggregate или hash;
- как это покрыто sanitizer tests.
