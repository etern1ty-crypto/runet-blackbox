# Contributing

Runet Blackbox is an observability project. Keep contributions focused on measurement, diagnosis, privacy, and reproducible public evidence.

## Ground Rules

- Do not add VPN, proxy, bypass, or circumvention features.
- Do not commit secrets, tokens, cookies, private logs, packet captures, or raw user telemetry.
- Prefer less data when privacy and statistical detail conflict.
- Keep checks lightweight. Do not stress third-party services.
- Add or update tests for every behavior change.

## Development

```bash
npm run check
npm test
node cli/bin/runet-blackbox.js sample --pretty
node cli/bin/runet-blackbox.js check example.com --no-http
```

## Measurement Reports

Use the official CLI when possible:

```bash
node cli/bin/runet-blackbox.js check github.com \
  --region Moscow \
  --provider Rostelecom \
  --connection-type home \
  --json --pretty
```

Before submitting:

- use a coarse region, not an address;
- do not paste IP addresses, account IDs, or private URLs into the issue text;
- validate the JSON with `node scripts/validate-report.mjs report.json`;
- submit one target per issue.

## Code Style

- Use plain Node.js APIs unless a dependency is clearly justified.
- Keep public JSON stable and backward-compatible within a schema version.
- Keep network logic testable with local mock servers.
- Prefer deterministic pure functions for diagnosis, privacy, and aggregation.
