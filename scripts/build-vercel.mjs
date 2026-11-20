import { execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const env = { ...process.env };
const prefix = env.SWEEP_RECORDING_BLOB_PREFIX?.replace(/\/+$/, "");

async function fetchRecordings(directory) {
  const token = env.SWEEP_RECORDING_BLOB_TOKEN;
  if (!token) throw new Error("SWEEP_RECORDING_BLOB_TOKEN is required for a private replay bundle");
  const { get, list } = await import("@vercel/blob");
  const key = `${prefix}/`;
  // A release contains derived replay assets only, never source bags or logs.
  const input = /^(?:decode\.mjs|runs\.json|recording-poster\.webp|(?:runs\/[a-z0-9]+(?:-[a-z0-9]+)*\/)?(?:manifest\.json|[a-z0-9-]+\.bin\.br|paths\.json\.gz|cones(?:-observed)?\.json\.gz))$/;
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: key, cursor, token });
    blobs.push(...page.blobs.filter(({ pathname }) =>
      pathname.startsWith(key) && input.test(pathname.slice(key.length))));
    if (page.hasMore && !page.cursor) throw new Error("Incomplete replay Blob listing");
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  if (!blobs.length) throw new Error("No replay assets found at SWEEP_RECORDING_BLOB_PREFIX");

  // Complete every transfer before deleting the temporary directory, even if one fails.
  const results = await Promise.allSettled(blobs.map(async ({ pathname, size }) => {
    const file = path.join(directory, pathname.slice(key.length));
    const blob = await get(pathname, { access: "private", token });
    if (blob?.statusCode !== 200) throw new Error(`Replay asset unavailable: ${pathname}`);
    await mkdir(path.dirname(file), { recursive: true });
    await pipeline(blob.stream, createWriteStream(file, { flags: "wx" }));
    if ((await stat(file)).size !== size) throw new Error(`Incomplete replay asset: ${pathname}`);
  }));
  const failed = results.find((result) => result.status === "rejected");
  if (failed) throw failed.reason;
}

function build(script, ...args) {
  execFileSync(process.execPath, [`scripts/${script}.mjs`, ...args], {
    cwd: root,
    env,
    stdio: "inherit",
  });
}

let temporary;
try {
  if (prefix) {
    if (env.SWEEP_RECORDING_DIR) throw new Error("Choose a local directory or a private Blob replay bundle");
    temporary = await mkdtemp(path.join(os.tmpdir(), "portfolio-replays-"));
    await fetchRecordings(temporary);
    env.SWEEP_RECORDING_DIR = temporary;
  }
  build("build-identity", "site", "--root");
} finally {
  if (temporary) await rm(temporary, { recursive: true, force: true });
}
