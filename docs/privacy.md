# Privacy

Runet Blackbox is designed to publish useful network evidence without turning contributors into identifiable telemetry sources.

## Not Collected By Design

- User IP address.
- Exact GPS location.
- Full response bodies.
- Raw HTTP headers.
- Cookies.
- Packet captures.
- Raw traceroute hops.

## Public Fields

- Target domain.
- Country code.
- Coarse region label.
- Provider label and optional ASN.
- Connection type category.
- Rounded UTC timestamp.
- Check statuses and coarse latency.
- Diagnosis category and confidence.

## Timestamp Rounding

Public reports are rounded down to 15-minute buckets. This reduces precision while preserving incident timelines.

## User Responsibility

Before submitting a report, review the generated JSON. Do not add private notes, account identifiers, or precise location details to GitHub issues.
