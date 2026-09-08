import fs from "node:fs/promises";
import path from "node:path";
import { collectFiles } from "./lib/files.mjs";
import { TOOL_VERSION } from "../src/constants.js";
import { availablePacks } from "../cli/internal/packs.js";
const pkg = JSON.parse(await fs.readFile("package.json", "utf8"));
const lock = JSON.parse(await fs.readFile("package-lock.json", "utf8"));
if (pkg.version !== TOOL_VERSION || lock.version !== pkg.version || lock.packages[""].version !== pkg.version) throw new Error("version metadata drift");
if (Object.keys(pkg.dependencies || {}).length || Object.keys(pkg.devDependencies || {}).length) throw new Error("review the documented zero-dependency contract before adding packages");
const errors = [];
const markdown = [...await collectFiles("docs", file => file.endsWith(".md")), "README.md", "CONTRIBUTING.md", "SECURITY.md", "ROADMAP.md"];
for (const file of markdown) {
  const content = await fs.readFile(file, "utf8");
  for (const match of content.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const link = match[1];
    if (/^(?:https?:|mailto:|#)/.test(link)) continue;
    const target = path.resolve(path.dirname(file), decodeURIComponent(link.split("#")[0]));
    try { await fs.access(target); } catch { errors.push(`${file}: broken link ${link}`); }
  }
  if (content.includes("\uFFFD")) errors.push(`${file}: damaged UTF-8 text`);
}
if (errors.length) throw new Error(errors.join("\n"));
console.log(`project metadata and ${markdown.length} documentation files verified; ${availablePacks().length} packs valid`);
