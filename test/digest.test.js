import test from "node:test";
import assert from "node:assert/strict";
import { buildWeeklyDigest, digestFileName, isoWeekLabel } from "../src/digest.js";

test("isoWeekLabel returns stable UTC week label", () => {
  assert.equal(isoWeekLabel(new Date("2026-05-01T12:00:00.000Z")), "2026-W18");
});

test("digestFileName uses ISO week label", () => {
  assert.equal(digestFileName("2026-05-01T12:00:00.000Z"), "2026-W18.md");
});

test("buildWeeklyDigest summarizes network weather without sensitive fields", () => {
  const markdown = buildWeeklyDigest({
    generated_at: "2026-05-01T12:00:00.000Z",
    total_reports: 3,
    total_targets: 1,
    dataset_quality: { label_ru: "Ранний набор данных" },
    weather: { incident_candidates: 1, degraded_candidates: 0, reports_needed: 0 },
    incident_candidates: [
      {
        key: "github.com",
        total: 3,
        degraded_ratio: 0.67,
        dominant_category: { title_ru: "Таймаут TLS" },
        credibility: { label_ru: "Мало отчётов" }
      }
    ],
    domains: []
  });
  assert.match(markdown, /Runet Blackbox Network Weather 2026-W18/);
  assert.match(markdown, /github\.com/);
  assert.match(markdown, /Privacy Boundary/);
  assert.doesNotMatch(markdown, /192\.168|authorization:|session=/i);
});
