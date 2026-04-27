# Volunteer Guide

Use this guide when collecting the first public measurements.

## Safe Collection

1. Use your own internet connection or a network where you are allowed to run basic connectivity checks.
2. Do not use stolen, leaked, or untrusted proxies.
3. Do not try to bypass filtering.
4. Do not run high-frequency loops.
5. Submit only sanitized CLI JSON.

## Recommended Command

```bash
node cli/bin/runet-blackbox.js check github.com \
  --region Moscow \
  --provider Rostelecom \
  --connection-type home \
  --json --pretty \
  --output report.json
```

Validate it:

```bash
node scripts/validate-report.mjs report.json
```

Then open a GitHub **Measurement report** issue and paste the JSON.

## Region Guidance

Use coarse labels:

- `Moscow`
- `Saint Petersburg`
- `Tatarstan`
- `Krasnodar Krai`
- `Novosibirsk Oblast`

Do not use street address, building, office, GPS coordinates, apartment complex, or Wi-Fi name.

## First Target Set

Start with a small mix:

- `github.com`
- `npmjs.com`
- `registry.npmjs.org`
- `docker.com`
- `hub.docker.com`
- `stackoverflow.com`
- `cloudflare.com`
- `example.com`

`example.com` is useful as a low-risk healthy control.
