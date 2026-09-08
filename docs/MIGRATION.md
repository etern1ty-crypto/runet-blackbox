# Миграция 0.3.1 → 0.4.0

Это сознательное изменение поведения, а не косметическое обновление.

| Было | Стало | Что сделать |
| --- | --- | --- |
| `check` / community weather как главный сценарий | `preflight` как CI gate, `check` сохранён | Используйте preflight для обязательного HTTP gate |
| Country не задан → RU | Не задан → ZZ (unknown) | Указывайте страну явно, если она нужна |
| HTTP 4xx/5xx мог считаться OK | Default требует final 2xx | Задайте только действительно штатные expected codes |
| TLS пропускал часть invalid certificates | Trust + hostname + expiry проверяются | Исправьте CA/trust; не отключайте TLS ради green status |
| URL paths/ports могли молча теряться | CLI root-only, неподдерживаемый URL — usage error | Передавайте hostname или HTTPS origin root |
| `--dns` не определял transport lookup | Адрес primary закреплён во всех фазах | Учитывайте новую согласованность результата |
| Comparison resolver IP в JSON | Label `comparison-1..3` | Не пытайтесь восстановить IP из public report |
| Report schema 1.0, permissive extra fields | Output 1.1, allowlist, typed constraints | Расширения требуют изменения контракта и тестов |
| Присланные diagnosis/ID считались достоверными | Import пересчитывает оба | Старые IDs могут измениться; не используйте их как подписи |
| Агрегаты всей истории | Default окно 24 часа | Для архива выберите окно явно; старые данные не равны live status |
| Повторы и unknown увеличивали degraded count | Dedup и отдельный unknown | Доли и incident candidates могут уменьшиться |
| Демо показывалось вместо отсутствующих данных | Демо только `?demo=1` | Пустое окно — ожидаемое честное поведение |
| Любой measurement title вызывал публикацию | Approval label maintainer’а | Создайте `approved-measurement` и процесс review |
| Отдельная concurrency group на issue | Общая группа writers | Контролируйте replaced pending runs, это не FIFO |

## Совместимость данных

JSON Schema допускает legacy `1.0` и current `1.1`, но `prepareReport` всегда выдаёт `1.1`. Valid legacy reports повторно очищаются и переинтерпретируются. Фиктивные hashes не сохраняются. Неизвестные публичные поля удаляются; schema-invalid значения не считаются success.

Метаданные неизвестной страны нормализуются осторожно для старых данных, поэтому историческая запись RU не превращается сама в ZZ. Новые CLI/buildReport defaults — ZZ.

Direct `validateReport` проверяет уже очищенный контракт. Для недоверенного входа сначала используйте canonical ingestion через CLI importer/validator. Старые consumer’ы, полагающиеся на произвольные extras, нуждаются в обновлении.

## Обновление

Сохраните резервную копию data store и сравните агрегаты в отдельном output directory. Не перезаписывайте raw archive без проверки. CLI binary/package версии сверяются локальными release checks; версия 0.4.0 в этом архиве не означает публикацию upstream/npm.
