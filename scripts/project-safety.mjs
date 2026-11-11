import { extname } from "node:path";

export function isPublicProject(repo, config) {
  return repo.private === false && repo.visibility === "public" && !repo.fork && !repo.archived &&
    config.include.includes(repo.name) && !config.exclude.includes(repo.name);
}

export function isSourceFile(entry, config) {
  const parts = entry.path.split("/");
  return entry.type === "blob" && entry.mode === "100644" &&
    parts.every((part) => part && !part.startsWith(".") && !config.excludeDirs.includes(part)) &&
    config.extensions.includes(extname(entry.path)) && !config.excludeFiles.includes(parts.at(-1)) &&
    entry.size > 0 && entry.size <= config.maxFileBytes;
}

export async function boundedBody(response, maxBytes) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw new Error("GitHub response exceeds the portfolio budget");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
