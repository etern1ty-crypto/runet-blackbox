<img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a1b27,50:F7DF1E,100:1a1b27&height=200&section=header&text=Runet%20Blackbox&fontSize=50&fontColor=FFFFFF&fontAlignY=35&desc=Network%20Observability%20for%20Unstable%20Networks&descSize=16&descColor=F7DF1E&descAlignY=55&animation=fadeIn" width="100%"/>

<div align="center">

[![validate](https://github.com/etern1ty-crypto/runet-blackbox/actions/workflows/validate.yml/badge.svg)](https://github.com/etern1ty-crypto/runet-blackbox/actions/workflows/validate.yml)
[![pages](https://github.com/etern1ty-crypto/runet-blackbox/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/etern1ty-crypto/runet-blackbox/actions/workflows/deploy-pages.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Node.js 22+](https://img.shields.io/badge/node-22+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Version](https://img.shields.io/badge/version-0.3.1-blue?style=flat-square)]()
[![Zero Dependencies](https://img.shields.io/badge/deps-zero-brightgreen?style=flat-square)]()
[![Privacy First](https://img.shields.io/badge/privacy-first-important?style=flat-square)]()

**🇷🇺 [Русский](#-описание) · 🇬🇧 [English](#-overview)**

</div>

---

## 🇬🇧 Overview

**Runet Blackbox** is a privacy-first network measurement toolkit for unstable networks. One command shows where access breaks — DNS, TCP, TLS, HTTP — and produces sanitized JSON reports for community aggregation.

> Network Weather for developer infrastructure. One command to see where access breaks, one sanitized report to help others compare symptoms.

**This is NOT** a VPN, proxy, bypass guide, or circumvention tool. It only measures, classifies, sanitizes, and aggregates public evidence.

### Quick Start (60 seconds)

Requirements: Node.js `22+`. Zero runtime dependencies.

```bash
npx runet-blackbox doctor
npx runet-blackbox check github.com --region Moscow --provider Rostelecom --issue-url
npx runet-blackbox check --pack dev --region Moscow --provider Rostelecom --copy-issue
```

### What CLI Does

For each target, the CLI performs a diagnostic chain:

| Step | Check |
|:---|:---|
| 1 | DNS `A`/`AAAA` via system resolver (or explicit `--dns`) |
| 2 | Optional DNS comparison via `--compare-dns` |
| 3 | TCP connect to ports `80` and `443` |
| 4 | TLS handshake with SNI on `443` |
| 5 | HTTPS request (if TLS succeeds) |
| 6 | Deterministic diagnosis with confidence & signals |
| 7 | Privacy sanitizer before JSON output |

### Example Output

```
Measurement: Runet Blackbox

Target:     github.com
Report ID:  rbb_...
Location:   RU/Moscow
Network:    Rostelecom AS12389 (home)
Diagnosis:  Available [ok]
Confidence: 94%
Summary:    Measured path completed successfully.
```

### What Gets Published / What Doesn't

<details>
<summary><b>Published</b></summary>

- Target domain or public IP
- Country and region (coarse)
- Provider label and optional ASN
- Connection type category
- `suspected_vpn_or_tunnel` boolean flag
- Timestamp (rounded to 15 min)
- Check statuses and coarse latency
- Diagnosis category, confidence, signals
</details>

<details>
<summary><b>NOT published</b></summary>

- User IP address
- Exact location
- Raw DNS answers
- HTTP headers, cookies, response bodies
- Packet captures, traceroute hops
- Credentials or private URLs
</details>

### Available Target Packs

```bash
npx runet-blackbox packs
# dev, ai, social, cloud, baseline
```

### Project Structure

```
apps/web/              Static GitHub Pages dashboard
cli/                   User-facing measurement CLI
data/reports/          Sanitized accepted JSONL reports
data/aggregates/       Generated dashboard data
data/digests/          Generated weekly Network Weather digests
docs/                  Methodology, privacy, volunteer docs
packs/                 Curated target packs
schemas/               Machine-readable report schema
scripts/               Import, validation, aggregation, CI helpers
src/                   Shared report, diagnosis, privacy logic
test/                  Unit and integration tests
```

### Development

```bash
git clone https://github.com/etern1ty-crypto/runet-blackbox.git
cd runet-blackbox
npm ci
npm run check    # lint + validate
npm test         # tests
npm run aggregate
```

### Exit Codes

| Code | Meaning |
|:---|:---|
| `0` | Measurement completed |
| `2` | Measurement completed, `--fail-on-degraded` found degradation |
| `64` | CLI argument error |
| `70` | Internal error |

### Documentation

- [Positioning](docs/positioning.md) — "why not another OONI?"
- [Privacy](docs/privacy.md)
- [Methodology](docs/methodology.md)
- [Threat Model](docs/threat-model.md)
- [Data Trust Model](docs/data-trust-model.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CHANGELOG.md](CHANGELOG.md)
- [ROADMAP.md](ROADMAP.md)

### Tech Stack

![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Node.js](https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/github_pages-222222?style=for-the-badge&logo=github&logoColor=white)

---

## 🇷🇺 Описание

**Runet Blackbox** — приватный инструмент измерения доступности для нестабильных сетей. Одна команда показывает, где ломается доступ — DNS, TCP, TLS, HTTP — и формирует санитизированные JSON-отчёты для агрегации сообществом.

> Сетевая метеосводка для разработчиков. Один запуск — видно где ломается, один отчёт — сравнение симптомов.

**Это НЕ** VPN, proxy, bypass guide и не инструмент обхода ограничений. Проект только измеряет, классифицирует, очищает и агрегирует публичные свидетельства.

### Быстрый Старт (60 секунд)

Требования: Node.js `22+`. Runtime-зависимостей нет.

```bash
npx runet-blackbox doctor
npx runet-blackbox check github.com --region Moscow --provider Rostelecom --issue-url
npx runet-blackbox check --pack dev --region Moscow --provider Rostelecom --copy-issue
```

### Что Делает CLI

Для каждой цели CLI выполняет цепочку:

| Шаг | Проверка |
|:---|:---|
| 1 | DNS `A`/`AAAA` через системный резолвер (или `--dns`) |
| 2 | Опциональное DNS сравнение через `--compare-dns` |
| 3 | TCP connect на порты `80` и `443` |
| 4 | TLS handshake с SNI на `443` |
| 5 | HTTPS запрос (если TLS успешен) |
| 6 | Детерминированный диагноз с confidence и signals |
| 7 | Privacy sanitizer перед JSON-выводом |

### Поток Отчёта

```
1. Волонтёр запускает CLI локально
2. CLI печатает диагноз и санитизированный JSON
3. Волонтёр открывает GitHub issue и вставляет JSON
4. GitHub Actions валидирует и санитизирует повторно
5. Принятые отчёты → data/reports/*.jsonl
6. Агрегаты → data/aggregates
7. Dashboard "Network Weather" на GitHub Pages
```

### Как Помочь

Начни с [CONTRIBUTING.md](CONTRIBUTING.md):

- Собрать реальные отчёты от разных провайдеров
- Помочь кампании [First 50 Reports](docs/first-50-reports.md)
- Предложить изменения target packs через PR
- Улучшить tests для diagnosis edge cases
- Перевести и вычитать docs

### Разработка

```bash
npm ci
npm run check
npm test
npm run aggregate
```

---

<div align="center">

**Release:** `v0.3.1` — DNS comparison with safer Windows/provider resolver diagnostics.

See [CHANGELOG.md](CHANGELOG.md) · [ROADMAP.md](ROADMAP.md)

### License

MIT — see [LICENSE](LICENSE) for details.

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a1b27,50:F7DF1E,100:1a1b27&height=80&section=footer" width="100%"/>

</div>
