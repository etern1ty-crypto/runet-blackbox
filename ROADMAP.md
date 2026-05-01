# Roadmap

## v0.4

- Make the first report flow almost zero-friction: `doctor`, `--issue-url`, and robust `--issue-file` fallbacks.
- Improve GitHub issue import comments for accepted/rejected reports.
- Add signed release checksums and provenance notes.
- Add more diagnosis fixtures from real sanitized reports.
- Run the "First 50 Reports" campaign around `dev`, `ai`, and `baseline` packs.

## v0.5

- Optional multi-resolver DNS comparison.
- Better provider/ASN normalization.
- Provider/ASN normalization beyond free-text labels.
- More dashboard filtering for provider, region, pack, and diagnosis category.

## Later

- Conservative optional QUIC/HTTP3 probe with low request volume.
- Community-maintained regional campaigns built around the core CLI.
- Exportable weekly summaries for Habr/dev.to posts.

## Non-Goals

- VPN/proxy/tunnel functionality.
- Bypass instructions.
- QUIC/DPI stress testing or traffic generation.
- Raw packet capture collection.
- Precise contributor geolocation.
