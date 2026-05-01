import test from "node:test";
import assert from "node:assert/strict";
import { buildOverviewShareCard, buildTargetShareCard } from "../src/share-card.js";

test("buildOverviewShareCard returns safe svg", () => {
  const svg = buildOverviewShareCard({
    generated_at: "2026-05-01T12:00:00.000Z",
    status: "mostly_ok",
    total_reports: 12,
    total_targets: 4,
    weather: { incident_candidates: 1, reports_needed: 2 },
    dataset_quality: { note_ru: "Ранний набор данных" }
  });
  assert.match(svg, /^<\?xml/);
  assert.match(svg, /Runet Blackbox/);
  assert.match(svg, /No IPs/);
});

test("buildTargetShareCard escapes target text", () => {
  const svg = buildTargetShareCard({
    key: "bad<target>.example",
    total: 1,
    degraded_ratio: 1,
    weather: { status: "degraded_candidate", label_ru: "Сигнал деградации", note_ru: "Проверка <важно>" },
    dominant_category: { title_ru: "DNS <timeout>" },
    credibility: { label_ru: "Один отчёт" }
  }, { generated_at: "2026-05-01T12:00:00.000Z" });
  assert.match(svg, /bad&lt;target&gt;\.example/);
  assert.match(svg, /Проверка &lt;важно&gt;/);
  assert.doesNotMatch(svg, /bad<target>|DNS <timeout>/);
});
