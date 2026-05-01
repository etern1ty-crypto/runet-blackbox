# First 50 Reports / Первые 50 отчётов

Цель кампании: собрать первые безопасные отчёты до большого публичного запуска, чтобы dashboard показывал живую Network Weather картину, а не пустые таблицы.

English: the goal is to seed the public dashboard with safe measurements before a wider launch.

## Target

- 50 accepted reports.
- 5+ providers or ASN labels.
- 5+ coarse regions.
- Packs: `baseline`, `dev`, `ai`.
- No private URLs, no corporate-only endpoints, no VPN/proxy/tun reports disguised as ISP reports.

## Recommended Commands

Single target:

```bash
npx runet-blackbox doctor
npx runet-blackbox check github.com --region Moscow --provider Rostelecom --connection-type home --issue-url
```

Developer infrastructure pack:

```bash
npx runet-blackbox check --pack dev --region Moscow --provider Rostelecom --connection-type home --issue-file dev.issue.md
```

AI services pack:

```bash
npx runet-blackbox check --pack ai --region Moscow --provider MTS --connection-type mobile --issue-file ai.issue.md
```

Baseline control:

```bash
npx runet-blackbox check --pack baseline --region Moscow --provider Rostelecom --connection-type home --issue-file baseline.issue.md
```

## Volunteer Checklist

- Use only your own network or a network where ordinary connectivity checks are allowed.
- Disable VPN/proxy/tun if you want to describe the report as an ISP path.
- Use coarse region names only.
- Do not paste logs, headers, cookies, private URLs, exact location, IP addresses, packet captures, or traceroute output.
- Wait for the GitHub Actions import comment. It will say how many reports were imported, duplicated, rejected, or sanitized.

## Launch Readiness

The campaign is ready for a wider post when:

- Dashboard has real aggregates.
- Measurement issues receive clear import feedback.
- README quickstart uses `npx`.
- At least one weekly digest exists.
- Rejected reports have understandable reasons and do not leak sensitive values.
