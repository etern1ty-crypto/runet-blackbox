# Приватность / Privacy

Runet Blackbox публикует полезные сетевые свидетельства, не превращая contributors в идентифицируемую telemetry source.

English: the project is designed to publish useful network evidence without exposing contributors.

## Не собирается по дизайну

- IP пользователя.
- Точная GPS/адресная локация.
- Full response bodies.
- Raw HTTP headers.
- Cookies.
- Packet captures.
- Raw traceroute hops.
- Private, loopback или local network targets.

## Публичные поля

- Target domain.
- Country code.
- Coarse region label.
- Provider label и optional ASN.
- Connection type category.
- Safe boolean marker `environment.suspected_vpn_or_tunnel`.
- Rounded UTC timestamp.
- Check statuses и coarse latency.
- Diagnosis category и confidence.
- Deterministic report ID от sanitized report.

`environment.suspected_vpn_or_tunnel` не содержит имена интерфейсов, IP-адреса, DNS-настройки, routing table или конфиги. Это только marker качества данных: отчёт может отражать VPN/tun/proxy путь, а не обычную сеть провайдера.

## Округление времени

Публичные отчёты округляются вниз до 15-минутных buckets. Это снижает точность tracking, но сохраняет incident timeline.

## Ответственность пользователя

Перед отправкой проверь JSON. Не добавляй private notes, account identifiers, точную локацию или приватные URL в GitHub issue.

Validation и import scripts санитизируют повторно server-side, но это последняя линия защиты. Самый безопасный отчёт — тот, в котором приватных данных не было изначально.
