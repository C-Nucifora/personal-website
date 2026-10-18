import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "concept/rack");
const output = path.join(root, "dist");
const extensions = new Set([".html", ".css", ".js", ".svg", ".woff2", ".ttf", ".txt"]);
const assetDirectories = new Set(["fonts", "vendor"]);

// Collect first so a missing source cannot erase the previous build.
await Promise.all(["index.html", "project.html"].map(async (name) => {
  if (!(await stat(path.join(source, name))).isFile()) {
    throw new Error(`Missing rack entry point: ${name}`);
  }
}));

const files = [];
async function collect(directory = "") {
  for (const entry of await readdir(path.join(source, directory), { withFileTypes: true })) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory() && (directory || assetDirectories.has(entry.name))) {
      await collect(relative);
    } else if (entry.isFile() && (extensions.has(path.extname(entry.name)) || relative === path.join("fonts", "sources.json"))) {
      files.push(relative);
    }
  }
}

await collect();
await rm(output, { recursive: true, force: true });
await Promise.all(files.map(async (relative) => {
  const destination = path.join(output, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(source, relative), destination);
}));

console.log(`Built rack portfolio: ${files.length} files in dist/`);
