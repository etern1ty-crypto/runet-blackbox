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
7. Classify report через deterministic signals.
8. Sanitize report перед записью JSON.

## Что можно предположить

- DNS failures: timeout, NXDOMAIN, resolver refusal, SERVFAIL, suspicious answers.
- TCP failures: timeout, reset, refused connection.
- TLS failures: timeout, reset after ClientHello, certificate mismatch.
- HTTP failures: conservative blockpage text, unexpected redirects, normal status codes.

## Что нельзя доказать одним отчётом

- Intent. Reset может быть фильтрацией, broken middlebox, поведением сервера или routing trouble.
- Global outage. `v0.1.0` не опрашивает независимые vantage points автоматически.
- Exact user location. Проект намеренно её не собирает.

## Classification

Diagnosis engine возвращает category, confidence score и human-readable signals. Категории консервативны. Если evidence недостаточно, отчёт остаётся `insufficient_data`.

Confidence — не юридическое и не политическое утверждение. Это инженерная оценка того, насколько локальные probe signals похожи на категорию.

## Воспроизводимость

Каждый public aggregate создаётся из sanitized JSONL reports в `data/reports`. Dashboard не использует приватную базу данных.

`report_id` строится детерминированно от sanitized public report. Он нужен для deduplication и ссылок, не для identity.
