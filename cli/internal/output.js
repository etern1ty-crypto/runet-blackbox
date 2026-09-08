import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/** Same-directory rename prevents torn snapshots. Each artifact is atomic, not a multi-file transaction. */
export async function atomicWriteFile(file, content) {
  const directory = path.dirname(file);
  await fs.mkdir(directory, { recursive: true });
  const temporary = path.join(directory, "." + path.basename(file) + "." + randomUUID() + ".tmp");
  let handle;
  try {
    handle = await fs.open(temporary, "wx", 0o600);
    await handle.writeFile(content, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fs.rename(temporary, file);
  } finally {
    await handle?.close();
    await fs.rm(temporary, { force: true });
  }
}
