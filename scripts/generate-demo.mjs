import fs from "node:fs/promises";
import { buildReport } from "../src/report.js";
import { aggregateReports } from "../src/aggregate.js";
import { buildOverviewShareCard, buildTargetShareCard } from "../src/share-card.js";
const now = new Date("2026-06-10T12:00:00Z");
const reports = [];
for (const [target, statuses] of [ ["github.com", ["ok", "ok", "ok", "ok"]], ["registry.npmjs.org", ["timeout", "timeout", "timeout", "ok"]], ["pypi.org", ["ok"]] ]) {
  statuses.forEach((status, i) => reports.push(buildReport({ target, timestamp: new Date(now.getTime() - i * 3600000), country: "ZZ", region: i % 2 ? "Example region B" : "Example region A", provider: i % 2 ? "Example network B" : "Example network A", connectionType: "hosting", results: { dns: { status }, tcp_443: { status: status === "ok" ? "ok" : "not_tested_due_to_dns_failure" }, tls: { status: status === "ok" ? "ok" : "not_tested_due_to_dns_failure" }, http: { status: status === "ok" ? "ok" : "not_tested_due_to_dns_failure", ...(status === "ok" ? { status_code: 200 } : {}) } } })));
}
const aggregate = aggregateReports(reports, { now });
aggregate.demo = true;
const directory = "data/demo/aggregates";
await fs.mkdir(directory + "/cards", { recursive: true });
await fs.writeFile(directory + "/index.json", JSON.stringify(aggregate, null, 2) + "\n");
await fs.writeFile(directory + "/cards/overview.svg", buildOverviewShareCard(aggregate));
for (const domain of aggregate.domains) await fs.writeFile(directory + "/cards/" + domain.key + ".svg", buildTargetShareCard(domain, aggregate));
console.log("Synthetic, explicitly opt-in demo regenerated");
