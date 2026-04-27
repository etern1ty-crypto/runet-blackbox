# Contributing

## Good First Contributions

- Add unit tests for diagnosis categories.
- Improve blockpage fingerprints without storing page bodies.
- Add dashboard filters.
- Improve docs and translations.
- Submit sanitized measurements through the issue form.

## Development

```bash
npm test
npm run check
node cli/bin/runet-blackbox.js check example.com --no-http
```

## Report Requirements

- Use the official CLI when possible.
- Keep region coarse, for example `Moscow`, `Tatarstan`, `Krasnodar Krai`.
- Do not include exact address, account IDs, phone numbers, or private URLs.
- Submit one target per issue unless maintainers ask otherwise.

## Code Style

- No runtime dependencies unless they remove substantial complexity.
- Prefer deterministic pure functions for classification and aggregation.
- Keep network checks testable with local mock servers.
- Add tests for every diagnosis or privacy rule change.
