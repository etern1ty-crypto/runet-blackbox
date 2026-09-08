# Развёртывание и Production

## Рекомендуемый первый deployment

Запускайте CLI **на той машине/в той сети, которую хотите измерить**. GitHub-hosted runner видит сеть GitHub, не сеть вашего офиса. Для исходящего egress из self-hosted runner используйте именно self-hosted runner.

Node.js 22 или 24 с актуальными security patches. Runtime npm dependencies отсутствуют. Не запускать с root/admin без необходимости. Проверки создают реальные DNS/TCP/TLS/HTTP соединения; соблюдайте внутреннюю policy и правила владельцев targets.

## CI job

Рабочий пример: [examples/github-actions-preflight.yml](../examples/github-actions-preflight.yml). Он рассчитан на checkout этого репозитория с его config/CLI. Для интеграции в application repository добавьте reviewed toolkit source/tarball отдельным шагом; не предполагается, что CLI сам появится в любом repo.

```bash
npm ci --ignore-scripts --no-audit
node cli/bin/runet-blackbox.js preflight --config config.example.json --json --output out/preflight.json --junit out/preflight.xml
```

Сохраняйте `out/` как job artifact даже при exit `2`. Не добавляйте `|| true` ко всему job: это превращает gate в фикцию. Невалидный config (`64`) и I/O error (`70`) требуют исправления, а не бесконечного retry.

Пилот сначала запускать advisory job, затем включить blocking gate после калибровки штатных redirects/HTTP-кодов в вашей сети. Front door `401/403` может быть нормой для сервиса и не доказывает проблему маршрута. Повторять проверки не чаще необходимого; начать с ручного запуска или интервала 5–15 минут. Не использовать для нагрузочного тестирования.

## Container

В репозитории есть [Dockerfile](../Dockerfile) и [.dockerignore](../.dockerignore).

```bash
docker build -t runet-blackbox:0.4.0 .
docker run --rm --init --read-only --cap-drop ALL --security-opt no-new-privileges runet-blackbox:0.4.0
```

Контейнер запускается user `node`, не root. JSON выводится в stdout. Для config/output монтируйте только необходимые пути, обеспечьте корректные права user `node`; filesystem контейнера может оставаться read-only, если output идёт в отдельный volume. Из контейнера измеряется его DNS/network namespace, а не автоматически сетевой путь хоста.

`node:24-bookworm-slim` — плавающий tag, не supply-chain pin. Для своей production-сборки выберите проверенный patch release и image digest, просканируйте Node/OS image. В поставленном sandbox Docker build не считается выполненным, если это явно не указано в VERIFICATION.md.

## Планировщик и Prometheus

Предпочтителен внешний systemd timer/cron с запретом перекрывающихся запусков. Сам CLI — one-shot, без демона, retries и background scheduler. Команда создаёт до 4 parallel targets и ограниченный объём запросов.

Один оператор/процесс должен владеть snapshot-файлом `.prom`. Атомарная замена защищает от половины файла, но несколько независимых запусков могут перезаписать снимки друг друга. Используйте scheduler lock, отдельные каталоги по runner и ротацию истории вне live snapshot.

Prometheus textfile не обеспечивает alerts автоматически. Подключите node_exporter textfile collector и отдельные правила для `success=0` и stale timestamp. Округление 15 минут означает, что stale threshold нельзя ставить меньше этого интервала. При остановке collector данные перестают обновляться; это не `success`.

## Dashboard

```bash
npm run aggregate
npm run build:web
python3 -m http.server 8080 --bind 127.0.0.1 --directory dist/web
```

Production: размещать содержимое **только `dist/web`** в static host за соответствующим контролем доступа. Не раздавать корень repo: там могут появиться локальные reports/config. Dashboard не получает raw reports, только агрегаты/summary. Markdown docs в static build являются файлами, а не отдельным Markdown renderer; на GitHub они отображаются штатно.

- `/` — real aggregate, пустота честно остаётся пустотой.
- `/?demo=1` — явно помеченный synthetic dataset.
- Окно по умолчанию 24 часа. Снимок старше 2 часов отмечается как устаревший.
- Для private deployments не использовать public Pages: provider/region labels даже после очистки могут быть чувствительными.
- GitHub Pages workflow пересобирает окно раз в час и после успешного import workflow. Schedule GitHub может задерживаться и отключаться при неактивности — это не realtime SLA.

## Публичный GitHub import: только после review

Автоматического импорта по заголовку `[measurement]` больше нет. Workflow запускается при добавлении maintainer label **`approved-measurement`**. Проверяйте весь issue body, включая prose вне JSON, прежде чем ставить label. Автор с обычными правами issue не может назначить label самостоятельно.

1. Автор добровольно создаёт issue. CLI лишь готовит body/URL, но не отправляет.
2. Maintainer проверяет разрешённость публикации, labels и отсутствие private prose.
3. Label-trigger обрабатывает snapshot body из event, не исполняет текст issue и не подставляет его в shell.
4. Importer повторно canonicalizes/validates, блокирует concurrent writer, deduplicates и пишет day shard.
5. Workflow коммитит данные, пересобирает окно и публикует summary.
6. Pages запускается через `workflow_run`: обычный push с `GITHUB_TOKEN` сам по себе не запустил бы цепочку workflows.

Общая GitHub concurrency group предотвращает параллельную запись, **но GitHub не гарантирует FIFO и может заменить pending run более новым**. Для потерянного pending run снимите/повторно поставьте approval label после review либо выполните локальный importer и PR. Для большого потока перейти к очереди/БД, не заявлять JSONL+Actions бесконечно масштабируемым SaaS.

Branch protection может блокировать bot push. Не ослабляйте protection автоматически: переходите на review PR или разрешённый процесс commits. При ошибке commit summary не подтверждает успешную публикацию. Re-run одной и той же event snapshot безопасен по content-based dedup.

Локальный lock `.import.lock` не захватывается принудительно после crash. Убедитесь, что writer остановлен, затем удалите **только stale lock directory** и повторите импорт. Не удаляйте активный lock.

## Release

```bash
npm run release:check
npm pack
```

Tag должен соответствовать `v` + package version; workflow проверяет это. Package, CLI version и lockfile сверяются `check-project`. GitHub workflow создаёт tarball, SHA256SUMS и provenance note, но note/hash **не равны криптографической подписи или trusted attestation**. Signing, digest pins и публикация npm — отдельные release-решения владельца.

## Production acceptance checklist

- [ ] Проверены реальные target paths и ожидаемые HTTP-коды в каждой согласованной сети.
- [ ] Установлен актуальный Node patch; OS/container просканированы отдельно.
- [ ] Согласованы probe rate, egress и правила владения output-файлами.
- [ ] Проверены SIGINT/SIGTERM и timer/systemd behavior на целевой ОС.
- [ ] Содержимое artifacts остаётся в разрешённой аудитории; public issue review включён.
- [ ] Подключён stale alert и назначен владелец разбора gate failures.
- [ ] Выполнена проверка fork/branch protection/Pages workflow в вашей организации.
