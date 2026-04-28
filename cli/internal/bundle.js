import { TOOL_VERSION } from "../../src/constants.js";

export function buildReportBundle({ pack, reports, environment }) {
  return {
    bundle_schema_version: "1.0",
    tool_version: TOOL_VERSION,
    generated_at: new Date().toISOString(),
    pack: {
      name: pack.name,
      label_ru: pack.label_ru,
      label: pack.label,
      targets_count: pack.targets.length
    },
    environment: publicEnvironment(environment),
    reports
  };
}

export function isReportBundle(value) {
  return Boolean(value && typeof value === "object" && Array.isArray(value.reports));
}

function publicEnvironment(environment) {
  return {
    suspected_vpn_or_tunnel: Boolean(environment?.suspected_vpn_or_tunnel)
  };
}
