# Настройка и конфигурация

## Один формат: JSON

[config.example.json](../config.example.json) — рабочий пример, не шаблон с незаполненными секретами. `.env` не нужен: у standalone CLI нет аккаунта и токенов. Файлы `.env` автоматически не читаются.

```json
{
  "version": 1,
  "targets": [
    { "target": "github.com", "expectedStatusCodes": [200] },
    { "target": "registry.npmjs.org", "expectedStatusCodes": [200] },
    { "target": "pypi.org", "expectedStatusCodes": [200] }
  ],
  "country": "ZZ",
  "region": "unknown",
  "provider": "unknown",
  "connectionType": "hosting",
  "timeoutMs": 5000,
  "concurrency": 2,
  "maxRedirects": 3,
  "maxBodyBytes": 65536,
  "dnsCompareServers": []
}
```

```bash
node cli/bin/runet-blackbox.js preflight --config config.example.json --json
```

## Приоритеты

**Defaults < JSON config < явно переданные CLI options.** CLI выбирает один источник: positional target, `--pack` или `--targets-file`. Он может заменить targets из конфигурации; остальные сетевые настройки конфига сохраняются. Сам JSON содержит `targets` **или** `pack`, не оба.

Outputs, clipboard, issue sharing и имя команды управляются только CLI. Конфиг не может навязать запись файла или публикацию. Неизвестные ключи и повторные singleton CLI options — ошибка `64`.

## Поля конфигурации

| Поле | Default | Допустимые значения / семантика |
| --- | --- | --- |
| `version` | обязательно | Число `1` |
| `targets` | default pack `ci`, если не выбрана цель | 1–32 уникальных нормализованных targets; строка или объект |
| `pack` | `ci` | `ci`, `dev`, `ai`, `social`, `cloud`, `baseline` |
| `timeoutMs` | `5000` | JSON integer, 250–60000; budget одной фазы |
| `concurrency` | `2` | JSON integer, 1–4 параллельные цели |
| `maxRedirects` | `3` | JSON integer, 0–5 |
| `maxBodyBytes` | `65536` | JSON integer, 1024–65536 |
| `country` | `ZZ` | Две латинские буквы; `ZZ` — неизвестно. Не определяется автоматически; членство в ISO-списке не проверяется |
| `region` | `unknown` | Coarse label, 1–80 символов; без управляющих символов |
| `provider` | `unknown` | Coarse label, 1–80 символов; не точный IP/адрес/имя пользователя |
| `asn` | `null` | 1–4294967295, число либо десятичная строка с необязательным `AS` |
| `connectionType` | `hosting` в preflight; `unknown` в check | `unknown`, `home`, `mobile`, `office`, `public_wifi`, `hosting`, `other` |
| `dnsServer` | `null` | IP DNS resolver. Может быть локальным resolver IP; этот IP не публикуется |
| `dnsCompareServers` | `[]` | Не более 3 различных IP. Повторы удаляются, превышение лимита — ошибка |

Конфиг до 64 KiB, targets textfile до 16 KiB. Они должны быть обычными файлами. Используйте UTF-8; BOM поддерживается.

## Цели и HTTP expectations

```json
{
  "version": 1,
  "targets": [
    "github.com",
    { "target": "example.com", "expectedStatusCodes": [200, 401] }
  ]
}
```

Это пример синтаксиса, а не утверждение, что example.com требует аутентификации. Укажите `401` только если он действительно штатный для вашей выбранной публичной цели.

- `target`: публичный hostname, public IP literal или HTTPS origin root. IDN нормализуется в punycode.
- Не поддерживаются credentials, URL path/query/fragment, custom ports, HTTP origin input, приватные endpoints и wildcards как паттерны сканирования.
- Проверяется root HTTPS GET; credentials, cookies, bearer token и произвольные headers отправить нельзя.
- Default: финальный `200..299`. Переходы `301/302/303/307/308` обрабатываются отдельно.
- `expectedStatusCodes`: 1–20 различных integer final codes, `200..299` или `400..599`. Нельзя указать `3xx`, потому что redirect не финальная успешная проверка.
- Явно разрешённый `503` технически считается ожидаемым ответом; это не делает сервис здоровым. Не ослабляйте gate ради зелёного статуса.
- Указанная expectation сохраняется как `expected_status_codes` в HTTP-результате для повторной интерпретации при импорте.

## DNS policy

`--dns` меняет primary и реальный закреплённый адрес транспортных probes. `--compare-dns` не меняет маршрут. Resolver IP не записывается в отчёт: `system`, `explicit`, `literal` или `comparison-1..3`.

Если **любой** полученный A/AAAA относится к private/reserved диапазону, цепочка останавливается с `suspicious_answer`. Это сознательная защита от DNS rebinding/SSRF; split-horizon сети с приватными ответами не входят в scope.

## Что влияет через окружение

Проект не имеет собственного `.env` слоя. Node/ОС могут учитывать настройки TLS trust store и системного resolver. Для корпоративного CA используйте поддерживаемый Node механизм `NODE_EXTRA_CA_CERTS` с проверенным CA-файлом; не отключайте проверку TLS через окружение или патч кода.

Сетевые probes не реализуют HTTP(S)_PROXY/SOCKS/VPN транспорт. Для сравнения сетей запускать сам CLI внутри соответствующей согласованной сети. Детектор VPN — эвристика по именам интерфейсов, не надёжное определение всех proxy/tunnel путей.

## Безопасные outputs

`--output`, `--junit`, `--prometheus`, `--issue-file` должны указывать на разные пути, не совпадающие с input config/targets file. Родительские директории создаются. Snapshot-файлы заменяются, а не дописываются. Для истории храните каждый запуск отдельно либо используйте отдельный review/import flow.

Настройки ниже в CLI не скрываются конфигом:

```bash
node cli/bin/runet-blackbox.js preflight --config config.example.json --timeout 3000 --concurrency 1 --json --junit out/check.xml
```
