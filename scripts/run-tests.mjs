#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { collectFiles } from "./lib/files.mjs";

const files = await collectFiles("test", (file) => file.endsWith(".test.js"));

for (const file of files) {
  await import(pathToFileURL(file));
}
