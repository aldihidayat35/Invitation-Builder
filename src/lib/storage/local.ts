import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { assertSafeKey, type StorageDriver } from "./types";

export function createLocalStorage(baseDir: string): StorageDriver {
  const root = resolve(baseDir);
  const pathFor = (key: string): string => {
    assertSafeKey(key);
    const full = resolve(join(root, key));
    if (!full.startsWith(root + sep)) throw new Error("Unsafe storage key");
    return full;
  };

  return {
    kind: "local",
    async presignPut() {
      return null;
    },
    async put(key, data) {
      const path = pathFor(key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, data);
    },
    async read(key, maxBytes) {
      try {
        const data = await readFile(pathFor(key));
        return new Uint8Array(data.subarray(0, maxBytes + 1));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async remove(key) {
      await rm(pathFor(key), { force: true });
    },
  };
}
