# Methodology

Runet Blackbox records application-level measurements that can be reproduced by ordinary users without privileged packet capture.

## Probe Order

1. Normalize the target into an ASCII domain or IP.
2. Resolve DNS `A` and `AAAA`.
3. Try TCP connections to ports `80` and `443`.
4. If TCP/443 succeeds, attempt a TLS handshake with SNI.
5. If TLS succeeds and HTTP is enabled, request `https://target/`.
6. Classify the report using deterministic signals.

## What The Tool Can Infer

- DNS failures: timeout, NXDOMAIN, resolver refusal, SERVFAIL, suspicious answers.
- TCP failures: timeout, reset, refused connection.
- TLS failures: timeout, reset after ClientHello, certificate mismatch.
- HTTP failures: suspicious blockpage text, unexpected redirects, normal status codes.

## What The Tool Cannot Prove Alone

- Intent. A reset can be caused by filtering, a broken middlebox, server behavior, or routing trouble.
- Global outage. V1 does not query independent vantage points automatically.
- Exact user location. The project deliberately avoids collecting it.

## Classification

The diagnosis engine returns a category, confidence score, and human-readable signals. Categories are conservative. Reports with insufficient evidence stay `insufficient_data`.

## Reproducibility

Every public aggregate is generated from sanitized JSONL reports in `data/reports`. The dashboard does not rely on a private database.
