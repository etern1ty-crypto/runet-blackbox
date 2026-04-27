# Security Policy

## Reporting Security Issues

Please report security or privacy issues through GitHub private vulnerability reporting if available, or contact the maintainer privately before opening a public issue.

Do not publish:

- working secrets or tokens;
- contributor IP addresses;
- packet captures;
- private URLs;
- raw headers, cookies, or response bodies.

## Supported Versions

`v0.1.x` receives security and privacy fixes.

## Project Boundary

Runet Blackbox is a measurement and diagnostics tool. It does not provide VPN, proxy, tunneling, traffic obfuscation, or bypass functionality.

## Privacy-Sensitive Changes

Changes that add new fields to reports must explain:

- why the field is necessary;
- whether it can identify a contributor;
- whether an aggregate or hash is enough;
- how it is tested by the sanitizer.
