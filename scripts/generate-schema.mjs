import fs from "node:fs/promises";
import { REPORT_SCHEMA } from "../src/report-fields.js";
const file = new URL("../schemas/report.schema.json", import.meta.url);
const text = JSON.stringify(REPORT_SCHEMA, null, 2) + "\n";
if (process.argv.includes("--check")) {
  const current = (await fs.readFile(file, "utf8")).replace(/\r\n/g, "\n");
  if (current !== text) throw new Error("schema drift: run npm run schema");
  console.log("report schema matches runtime contract");
} else {
  await fs.writeFile(file, text);
}
