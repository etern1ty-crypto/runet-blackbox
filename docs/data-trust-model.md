# Data Trust Model / Модель доверия к данным

Runet Blackbox treats public reports as community evidence, not as proof.

Runet Blackbox рассматривает публичные отчёты как сигналы сообщества, а не как доказательство.

## Signal Levels

- `single_report`: один отчёт. Полезно для triage, недостаточно для вывода о массовой проблеме.
- `low`: несколько отчётов, но мало независимых повторов.
- `medium`: достаточно отчётов для осторожного сравнения целей, регионов и провайдеров.
- `higher`: больше подтверждений, но всё ещё community evidence без криптографической аттестации клиента.

## Network Weather Labels

- `Reports needed`: данных мало, нужны повторные замеры.
- `Weak signal`: есть первые данные, но выборка недостаточна.
- `Degraded candidate`: симптомы деградации есть, но подтверждений мало.
- `Incident candidate`: несколько отчётов указывают на деградацию; нужны независимые сети и повтор.
- `Mostly OK`: текущие публичные отчёты в основном успешны.

## What Improves Confidence

- Повторение отчётов в разные временные окна.
- Несколько провайдеров или ASN.
- Несколько регионов без точной геолокации.
- Одинаковый diagnosis pattern: DNS, TCP, TLS или HTTP.
- Наличие baseline reports рядом с проблемным target.

## What Lowers Confidence

- Один отчёт.
- Включённый VPN/proxy/tun.
- Неизвестный provider или region.
- Ручные правки JSON.
- Проверка private URL, корпоративной сети или локального hostname.

## Public Promise

Проект не публикует IP пользователя, точную локацию, raw DNS answers, headers, cookies, response bodies, packet captures, traceroute hops, credentials или private URLs.

If sensitive fields are accidentally included, import sanitizes again and the issue receives a summary with the number of stripped fields.
