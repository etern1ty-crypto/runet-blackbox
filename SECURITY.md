# Security policy

## Scope

Линия исправлений этой поставки — **0.4.x**. Это политика для подготовленной ревизии, а не обещание поддержки от upstream maintainer. Более старые версии имеют документированные проблемы: см. [аудит](docs/AUDIT.md).

Сообщайте security/privacy issues через private vulnerability reporting репозитория, **если владелец включил эту возможность**, или согласованный приватный канал maintainer’а. Не размещайте secrets и сырые клиентские логи в public issue. В архиве не выдуман контакт, который никто не обслуживает.

## Ответственное воспроизведение

Используйте локальные mock servers, публичные examples и тестовые ключи. Не проверяйте чужие внутренние сети. Приложите Node/OS version, команду, ожидаемый/фактический результат и минимальный sanitized report без точной локации.

## Dependencies и supply chain

Runtime и dev npm dependencies отсутствуют, но Node/OpenSSL/ОС, контейнер base image и GitHub Actions всё равно требуют security updates. Zero npm dependencies **не означает zero vulnerabilities**. Actions major tags и Docker base tag не immutable pins: для production замените их проверенными SHA/digest в собственном release process.

Инструмент не поддерживает передачу credentials/headers/private endpoints. Не превращайте internal probe helpers в открытый произвольный API. В тестах есть явно обозначенный public private key для localhost; он не должен использоваться как реальный credential.

Полная [модель угроз](docs/PRIVACY.md) и [production checklist](docs/DEPLOYMENT.md).
