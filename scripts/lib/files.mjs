import fs from "node:fs/promises";
import path from "node:path";

export async function readText(filePath) {
  return stripBom(await fs.readFile(filePath, "utf8"));
}

export async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

export function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function collectFiles(root, predicate) {
  const files = [];
  async function walk(directory) {
    let entries = [];
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (predicate(absolute)) {
        files.push(absolute);
      }
    }
  }
  await walk(root);
  return files.sort();
}

export async function readJsonl(filePath) {
  const text = await readText(filePath);
  return text
    .split(/\r?\n/)
    .map((line) => stripBom(line).trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
