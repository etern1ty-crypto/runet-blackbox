# Методология / Methodology

Runet Blackbox записывает application-level measurements, которые обычный пользователь может воспроизвести без privileged packet capture.

English: conservative, reproducible network measurements without privileged packet capture.

## Порядок проверок

1. Normalize target в ASCII domain или public IP.
2. Reject local, private, loopback, multicast и reserved targets.
3. Resolve DNS `A` и `AAAA` через системный resolver или явно заданный `--dns`.
4. Try TCP connections к портам `80` и `443`.
5. Если TCP/443 успешен, выполнить TLS handshake с SNI.
6. Если TLS успешен и HTTP включён, запросить `https://target/`.
7. Локально проверить наличие VPN/tun/proxy-похожих интерфейсов и сохранить только безопасный boolean marker.
8. Classify report через deterministic signals.
9. Sanitize report перед записью JSON.

Для `--pack` CLI последовательно выполняет тот же pipeline для каждого target из `packs/*.json` и формирует JSON bundle. Import workflow разбирает bundle на отдельные reports.

## Что можно предположить

- DNS failures: timeout, NXDOMAIN, resolver refusal, SERVFAIL, suspicious answers.
- TCP failures: timeout, reset, refused connection.
- TLS failures: timeout, reset after ClientHello, certificate mismatch.
- HTTP failures: conservative blockpage text, unexpected redirects, normal status codes.

## Что нельзя доказать одним отчётом

- Intent. Reset может быть фильтрацией, broken middlebox, поведением сервера или routing trouble.
- Global outage. Текущая версия не опрашивает независимые vantage points автоматически.
- Exact user location. Проект намеренно её не собирает.
- VPN status with certainty. CLI видит только локальные признаки интерфейсов и не публикует детали.

## Classification

Diagnosis engine возвращает category, confidence score и human-readable signals. Категории консервативны. Если evidence недостаточно, отчёт остаётся `insufficient_data`.

Confidence — не юридическое и не политическое утверждение. Это инженерная оценка того, насколько локальные probe signals похожи на категорию.

## Воспроизводимость

Каждый public aggregate создаётся из sanitized JSONL reports в `data/reports`. Dashboard не использует приватную базу данных.

`report_id` строится детерминированно от sanitized public report. Он нужен для deduplication и ссылок, не для identity.
