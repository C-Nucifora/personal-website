/**
 * Copies the TypeScript default lib files (es2022 target + dom) from
 * node_modules/typescript/lib into data/generated/ts-libs.json. Imported
 * only by the TS intelligence worker chunk (spec 2026-06-12) — first
 * paint never pays for it. Deterministic per typescript version.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Roots; their /// <reference lib="…"> chains get pulled in below. */
const ROOTS = ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts", "lib.decorators.d.ts", "lib.decorators.legacy.d.ts"];

function main() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const libDir = `${root}node_modules/typescript/lib/`;
  const out = {};
  const queue = [...ROOTS];
  while (queue.length) {
    const name = queue.pop();
    if (out[name]) continue;
    const text = readFileSync(`${libDir}${name}`, "utf8");
    out[name] = text;
    for (const m of text.matchAll(/\/\/\/\s*<reference\s+lib="([^"]+)"\s*\/>/g)) {
      queue.push(`lib.${m[1]}.d.ts`);
    }
  }
  const json = JSON.stringify(out);
  writeFileSync(`${root}data/generated/ts-libs.json`, json);
  console.log(
    `bundle-ts-libs: ${Object.keys(out).length} lib files, ${(json.length / 1024 / 1024).toFixed(1)} MB`,
  );
}

if (process.argv[1]?.endsWith("bundle-ts-libs.mjs")) main();
