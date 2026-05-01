# Release Checklist

## Before Tagging a Release

- `git status --short` shows only intended changes.
- `npm run check` passes.
- `node cli/bin/runet-blackbox.js sample --pretty` prints valid JSON.
- `node scripts/validate-report.mjs examples/reports/ok.example.json` passes.
- `node scripts/aggregate.mjs` regenerates aggregates.
- `data/aggregates/cards/overview.svg` is generated and contains no sensitive fields.
- `data/digests/YYYY-WW.md` is generated and describes dataset quality limits.
- README explains what the project is and is not.
- Privacy and threat model docs are up to date.
- GitHub issue templates are present.
- GitHub Actions workflows are present.
- `.codex`, credentials, tokens, cookies, and private logs are not staged.

## Release Notes Template

```text
Runet Blackbox vX.Y.Z

Short release summary.

Highlights:
- ...

Non-goals:
- No VPN/proxy/bypass functionality.
- No central telemetry server.
```
