# Стратегия продукта / Product Strategy

## North Star

Runet Blackbox должен быть не “ещё одной проверкой домена”, а **Network Weather for developer infrastructure**.

Русская формулировка: **сетевая метеосводка для разработчиков**.

Проект отвечает на один вопрос: “где ломается доступ к важному сервису из этой сети: DNS, TCP, TLS, HTTP, провайдер, регион или сам сервис?”

## Архитектура роста

### Core

`runet-blackbox` остаётся главным репозиторием. В нём живут:

- CLI;
- report schema;
- privacy sanitizer;
- diagnosis engine;
- target packs;
- GitHub issue importer;
- aggregator;
- GitHub Pages dashboard;
- documentation and tests.

Звёзды, issues, PR и доверие должны концентрироваться здесь.

### Packs

Packs — это curated наборы целей в `packs/*.json`.

- `dev`: GitHub, package registries, Docker, StackOverflow, JetBrains.
- `ai`: OpenAI, ChatGPT, HuggingFace, Anthropic.
- `social`: Telegram, Discord, YouTube, Reddit.
- `cloud`: Cloud/CDN/platform front doors.
- `baseline`: контрольные стабильные цели.

Packs должны оставаться маленькими и безопасными. Их цель — triage, а не нагрузочное тестирование.

### Campaigns

Спутники проекта лучше делать не как форки кода, а как кампании:

- “First 50 Reports”;
- “Developer infra in regions”;
- “AI access weather”;
- “Baseline from home/mobile/office networks”.

Кампании могут жить в GitHub Discussions, Issues, Pages или отдельных data-only репозиториях. Код остаётся в core.

## Trust Model

- `1 report`: weak signal / нужен повтор.
- `2-4 reports`: low sample / полезно для triage.
- `3+ degraded reports for one target`: incident candidate, если деградация преобладает.
- `5+ reports`: cautious comparison is possible.
- `15+ reports`: stronger community evidence, still not legal/scientific proof.

Dashboard и агрегаты не должны выдавать одиночные отчёты за доказательство массовой проблемы.

## Safety Boundaries

Проект не должен становиться:

- VPN;
- proxy;
- tunnel;
- bypass guide;
- DPI stress tester;
- packet capture collector;
- precise geolocation dataset.

QUIC/HTTP3 и ECH можно добавлять только как консервативные низкочастотные probes, без генерации нагрузки и без инструкций по обходу.

## Road to GitHub Visibility

1. Publish npm package for true `npx runet-blackbox ...`.
2. Make `--pack dev --copy-issue` the main public workflow.
3. Run the First 50 Reports campaign before external launch.
4. Show Network Weather on the dashboard, not empty tables.
5. Generate weekly Markdown digests from public aggregates.
6. Add signed releases and checksums.
7. Keep README as a landing page: one command, one screenshot/GIF, one clear safety boundary.
