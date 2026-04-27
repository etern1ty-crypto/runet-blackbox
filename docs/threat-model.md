# Threat Model

## Assets

- Contributor privacy.
- Integrity of public measurements.
- Trustworthiness of aggregated status.
- Repository maintainability.

## Adversaries

- Spam reporters submitting fabricated data.
- Automated bots flooding issue forms.
- Middleboxes changing behavior based on known probes.
- Well-intentioned users accidentally publishing sensitive details.

## Controls In V1

- Strict schema validation.
- Sanitization before storage.
- No raw IP/body/header storage.
- Deduplication by stable report hash.
- Deterministic aggregation from committed data.

## Known Gaps

- No Sybil resistance.
- No independent server-side validation.
- No cryptographic attestation from measurement clients.
- No signed releases yet.

These gaps are acceptable for the first public MVP because the goal is transparent community evidence, not a legal-grade measurement oracle.
