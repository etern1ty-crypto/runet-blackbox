# Changelog

## Unreleased

### Added

- CLI `doctor` command for safe local readiness checks before the first public report.
- CLI `--issue-url` option for single-target prefilled GitHub measurement issue URLs.
- GitHub issue import feedback comments for accepted, duplicate, rejected, and sanitized reports.
- Data trust model and First 50 Reports campaign documentation.
- Release artifact workflow for npm tarball checksums and provenance notes on `v*` tags.

### Changed

- Clipboard submission now tries multiple Linux providers (`wl-copy`, `xclip`, `xsel`) before falling back.
- README, dashboard, issue template, and volunteer guide now lead with `npx`, `doctor`, and `--issue-url` for lower-friction onboarding.
- Dashboard target list can be filtered by Network Weather status, diagnosis, provider, and region.

## v0.3.0 - 2026-05-01

### Added

- Aggregates now include per-target provider, region, day, dominant diagnosis, latest-report, and provider incident-candidate details.
- `scripts/aggregate.mjs` generates weekly Network Weather digests in `data/digests/YYYY-WW.md`.
- `scripts/aggregate.mjs` generates privacy-safe SVG share cards in `data/aggregates/cards`.
- Dashboard now includes Network Weather counters, per-target detail panels, SVG card links, and a simple timeline view.
- Tests cover digest generation, SVG escaping, and target-detail aggregate fields.

### Changed

- README quickstart now leads with the published `npx runet-blackbox` path instead of requiring `git clone`.

## v0.2.0 - 2026-04-28

### Fixed

- Windows CLI test path resolution now uses file URL conversion instead of raw URL paths.
- Windows PowerShell UTF-8 BOM reports are accepted by validation and import scripts.
- `npm ci` now works from a clean checkout via `package-lock.json`.
- CI now validates on both Ubuntu and Windows.
- DNS checks now use the OS resolver by default, which avoids Windows tunnel-adapter `ECONNREFUSED` false failures.
- `--dns` is accepted as a short alias for `--dns-server`.
- CLI can generate a ready-to-submit GitHub issue body through `--issue-file` or `--copy-issue`.
- CLI supports curated target packs through `runet-blackbox packs` and `check --pack dev|ai|social|cloud|baseline`.
- Pack runs generate JSON bundles, and the GitHub issue importer can ingest bundles as multiple sanitized reports.
- Reports include a safe `environment.suspected_vpn_or_tunnel` marker when the local CLI detects VPN/tun/proxy-like interfaces.

### Changed

- README, volunteer guide, CLI help, and dashboard are Russian-first with concise English companion text.
- Dashboard onboarding was redesigned around first-run usage, safety boundaries, and report submission.
- Empty production dashboards now fall back to explicit synthetic demo data.
- Aggregates include sample credibility labels for early/single-report data.
- Aggregates include Network Weather labels and incident candidates.

## v0.1.0 - 2026-04-27

Initial public measurement release.

### Added

- Node.js CLI with DNS, TCP, TLS, and HTTP probes.
- Deterministic diagnosis categories and confidence scores.
- Privacy-first JSON report format with `report_id`.
- Sanitizer for IPs, headers, cookies, bodies, traceroute data, packet captures, and related sensitive fields.
- GitHub issue-based report intake.
- GitHub Actions validation, import, aggregation, and Pages deployment workflows.
- Static dashboard backed by generated JSON aggregates.
- Methodology, privacy, threat model, security, contributing, roadmap, and volunteer documentation.
- Extensive zero-dependency test suite.

### Safety Boundary

- No VPN, proxy, tunneling, or circumvention features.
- No central server required.
- No raw user IP, headers, cookies, bodies, packet captures, or exact location in public data.
