import { readFileSync } from "node:fs";
import { validateMeasurementTarget } from "../../src/target-policy.js";

const PACK_FILES = new Map([
  ["dev", "dev.json"],
  ["ai", "ai.json"],
  ["social", "social.json"],
  ["cloud", "cloud.json"],
  ["baseline", "baseline.json"]
]);

export function availablePacks() {
  return Array.from(PACK_FILES.keys()).map(loadPack);
}

export function loadPack(name) {
  const normalized = String(name || "").trim().toLowerCase();
  const file = PACK_FILES.get(normalized);
  if (!file) {
    throw usageError(`unknown pack: ${name}. Use \`runet-blackbox packs\` to list available packs.`);
  }

  const pack = JSON.parse(readFileSync(new URL(`../../packs/${file}`, import.meta.url), "utf8"));
  const targets = Array.isArray(pack.targets) ? pack.targets : [];
  if (!targets.length) {
    throw usageError(`pack ${normalized} has no targets`);
  }
  for (const target of targets) {
    const validation = validateMeasurementTarget(target);
    if (!validation.valid) {
      throw usageError(`pack ${normalized} contains unsafe target ${target}: ${validation.reason}`);
    }
  }
  return {
    name: normalized,
    label_ru: pack.label_ru || normalized,
    label: pack.label || normalized,
    description_ru: pack.description_ru || "",
    description: pack.description || "",
    targets
  };
}

function usageError(message) {
  const error = new Error(message);
  error.exitCode = 64;
  return error;
}
