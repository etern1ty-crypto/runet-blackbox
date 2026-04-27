# Runet Blackbox

Open-source observability for blocked, degraded, and unstable networks.

Runet Blackbox answers a narrow engineering question:

> A service is unavailable from a Russian network. Is it DNS, TCP, TLS, HTTP, DPI, provider-level degradation, a local issue, or a likely global outage?

This project does **not** provide censorship circumvention. It measures failures, classifies evidence, and publishes sanitized aggregates that can be audited.

## What works in v0.1

- Node-based CLI with DNS, TCP, TLS, and HTTP probes.
- Privacy-preserving JSON report format.
- Strict validation without external dependencies.
- Sanitization that removes raw IPs, response bodies, raw headers, and traceroute-like data.
- Aggregation scripts for GitHub Actions.
- Static dashboard for GitHub Pages.
- Issue template for community-submitted reports.
- Broad unit and integration test coverage using Node's built-in test runner.

## Quick Start

```bash
npm test
node cli/bin/runet-blackbox.js check github.com --region Moscow --provider Rostelecom --json
```

Save a report:

```bash
node cli/bin/runet-blackbox.js check github.com --region Moscow --provider Rostelecom --output report.json
```

Validate a report:

```bash
node scripts/validate-report.mjs report.json
```

Rebuild aggregates:

```bash
npm run aggregate
```

## Repository Layout

```text
apps/web/                 Static GitHub Pages dashboard
cli/                      User-facing measurement CLI
data/reports/             Sanitized accepted JSONL reports
data/aggregates/          Generated dashboard data
docs/                     Methodology, privacy, contributing docs
schemas/report.schema.json Machine-readable report schema
scripts/                  Import, validation, aggregation, CI helpers
src/                      Shared report, diagnosis, privacy, and aggregation logic
test/                     Unit and integration tests
```

## Report Flow

1. A tester runs the CLI locally.
2. The CLI prints a local diagnosis and a JSON report.
3. The tester submits that JSON through a GitHub issue form.
4. GitHub Actions validates and sanitizes the report.
5. The aggregator updates public JSON aggregates.
6. GitHub Pages renders the dashboard.

## Safety Boundary

Runet Blackbox is an evidence and observability tool. It intentionally avoids:

- proxy/VPN configuration;
- bypass instructions;
- publishing user IP addresses;
- publishing full HTTP bodies;
- publishing raw packet captures;
- storing precise user location.

See [Privacy](docs/privacy.md) and [Methodology](docs/methodology.md).
