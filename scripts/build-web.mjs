import fs from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist/web");
await fs.rm(root, { recursive: true, force: true });
await fs.mkdir(root, { recursive: true });
await fs.cp("apps/web", root, { recursive: true });
for (const directory of ["data/aggregates", "data/demo", "data/digests", "docs", "schemas"]) {
  try { await fs.cp(directory, path.join(root, directory), { recursive: true }); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
await fs.copyFile("README.md", path.join(root, "README.md"));
console.log("Static site ready: dist/web (serve this directory, never the repository root)");
