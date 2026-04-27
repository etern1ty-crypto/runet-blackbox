# Runet Blackbox

[![validate](https://github.com/etern1ty-crypto/runet-blackbox/actions/workflows/validate.yml/badge.svg)](https://github.com/etern1ty-crypto/runet-blackbox/actions/workflows/validate.yml)
[![pages](https://github.com/etern1ty-crypto/runet-blackbox/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/etern1ty-crypto/runet-blackbox/actions/workflows/deploy-pages.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Open network observability for unstable networks.**

Runet Blackbox is a privacy-first measurement toolkit that answers one practical question:

> A service is unavailable from this network. Is the evidence closer to DNS failure, TCP timeout, TLS reset, HTTP blockpage, provider degradation, local trouble, or a likely service outage?

It is not a VPN, proxy, bypass guide, or circumvention tool. It only measures, classifies, sanitizes, and aggregates evidence.

## 60 Second Quickstart

Requirements: Node.js `22+`. No install step and no runtime dependencies.

```bash
git clone https://github.com/etern1ty-crypto/runet-blackbox.git
cd runet-blackbox
npm test
node cli/bin/runet-blackbox.js check github.com --region Moscow --provider Rostelecom
```

Generate a public JSON report:

```bash
node cli/bin/runet-blackbox.js check github.com \
  --region Moscow \
  --provider Rostelecom \
  --connection-type home \
  --json --pretty \
  --output report.json
```

Validate before submitting:

```bash
node scripts/validate-report.mjs report.json
```

Submit the JSON through a **Measurement report** GitHub issue.

## What The CLI Does

For one target, the CLI runs a conservative probe chain:

- DNS `A` and `AAAA` resolution;
- TCP connect to `80` and `443`;
- TLS handshake with SNI on `443`;
- HTTPS request when TLS succeeds;
- deterministic diagnosis with confidence and evidence signals;
- privacy sanitizer before JSON output.

Example human output:

```text
Runet Blackbox measurement

Target:     github.com
Report ID:  rbb_...
Location:   RU/Moscow
Network:    Rostelecom AS12389 (home)
Diagnosis:  Reachable [ok]
Confidence: 94%
Summary:    The measured path completed successfully.
```

## What Gets Published

Published reports intentionally contain less data than the CLI observes.

Stored:

- target domain or public IP;
- coarse country and region label;
- provider label and optional ASN;
- connection type category;
- timestamp rounded to 15 minutes;
- check statuses and coarse latency;
- diagnosis category, confidence, and short signals.

Not stored:

- user IP address;
- exact location;
- raw DNS answers;
- HTTP headers;
- cookies;
- response bodies;
- packet captures;
- traceroute hops;
- credentials or private URLs.

See [Privacy](docs/privacy.md), [Methodology](docs/methodology.md), and [Threat Model](docs/threat-model.md).

## Report Flow

1. A volunteer runs the CLI locally.
2. The CLI prints a local diagnosis and sanitized JSON.
3. The volunteer opens a GitHub measurement issue and pastes the JSON.
4. GitHub Actions validates and sanitizes the report again.
5. Accepted reports are stored in `data/reports/*.jsonl`.
6. Aggregates are regenerated into `data/aggregates`.
7. GitHub Pages renders the static dashboard.

There is no central server in v0.1.0.

## Commands

```bash
node cli/bin/runet-blackbox.js help
node cli/bin/runet-blackbox.js version
node cli/bin/runet-blackbox.js sample --pretty
node cli/bin/runet-blackbox.js check example.com --no-http
node cli/bin/runet-blackbox.js check github.com --json --pretty
node scripts/aggregate.mjs
npm run check
```

Exit codes:

- `0`: measurement completed;
- `2`: measurement completed and `--fail-on-degraded` found degradation;
- `64`: command-line usage error;
- `70`: internal error.

## Repository Layout

```text
apps/web/                  Static GitHub Pages dashboard
cli/                       User-facing measurement CLI
data/reports/              Sanitized accepted JSONL reports
data/aggregates/           Generated dashboard data
docs/                      Methodology, privacy, volunteer docs
examples/                  Safe example inputs and reports
schemas/report.schema.json Machine-readable report schema
scripts/                   Import, validation, aggregation, CI helpers
src/                       Shared report, diagnosis, privacy, aggregation logic
test/                      Unit and integration tests
```

## Development

```bash
npm run check
npm test
npm run aggregate
```

The project deliberately has no runtime dependencies in v0.1.0. Add dependencies only when they remove meaningful complexity and keep the public measurement path auditable.

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Good first contributions:

- collect real reports from different providers and regions;
- improve diagnosis tests;
- add conservative blockpage fingerprints without storing page bodies;
- improve dashboard filtering;
- translate volunteer instructions.

## Release Status

Current target: `v0.1.0`, first public measurement release.

See [CHANGELOG.md](CHANGELOG.md), [ROADMAP.md](ROADMAP.md), and [docs/release-checklist.md](docs/release-checklist.md).
