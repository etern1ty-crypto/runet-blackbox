import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { collectFiles } from "./lib/files.mjs";

const execFileAsync = promisify(execFile);
const roots = ["src", "cli", "scripts", "test", "apps/web"];
const files = [];

for (const root of roots) {
  files.push(
    ...(await collectFiles(root, (file) => file.endsWith(".js") || file.endsWith(".mjs")))
  );
}

for (const file of files) {
  await execFileAsync(process.execPath, ["--check", file]);
}

process.stdout.write(`syntax ok: ${files.length} files\n`);
