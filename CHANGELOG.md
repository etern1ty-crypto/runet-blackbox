# Changelog

## Unreleased

### Fixed

- Windows CLI test path resolution now uses file URL conversion instead of raw URL paths.
- Windows PowerShell UTF-8 BOM reports are accepted by validation and import scripts.
- `npm ci` now works from a clean checkout via `package-lock.json`.
- CI now validates on both Ubuntu and Windows.

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
