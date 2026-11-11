import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { Markdown } from "../components/terminal/output/Markdown";
import { boundedBody, isPublicProject, isSourceFile } from "./project-safety.mjs";
import { projectsConfig } from "../data/projects-config.mjs";

const root = "/portfolio-fixture";
const metadata = join(root, "data/generated/github-projects.ts");
const sources = join(root, "data/generated/github-sources.ts");
const site = join(root, "data/generated/site-source.ts");
const githubStaging = join(dirname(metadata), ".github-snapshot-fixture");
const siteStaging = join(dirname(site), ".site-source-fixture");
const revision = "a".repeat(40);
const config = { ...projectsConfig, username: "fixture-owner", include: ["fixture-repo"], featured: [], overrides: {} };
const repo = { name: "fixture-repo", private: false, visibility: "public", fork: false, archived: false,
  default_branch: "main", description: "Synthetic project", language: "TypeScript", topics: [],
  html_url: "https://github.com/fixture-owner/fixture-repo", stargazers_count: 0, pushed_at: "2026-01-01" };
const entry = { path: "src/index.ts", type: "blob", mode: "100644", size: 3 };

function response(value: unknown, raw = false) {
  const body = Buffer.from(raw ? String(value) : JSON.stringify(value));
  return { ok: true, status: 200, body: (async function* () { yield body; })() };
}

type Options = {
  listing?: unknown;
  visibility?: unknown;
  tree?: unknown;
  readme?: unknown;
  raw?: string;
  fault?: "abort" | "oversize" | "invalid-json";
  failWrite?: string;
  failRename?: string;
  failBackup?: string;
  failRestore?: boolean;
  failRemove?: boolean;
  failStaging?: boolean;
  missingSnapshot?: string;
  extraFiles?: [string, string][];
  offline?: boolean;
  noSnapshot?: boolean;
};

function memoryFiles(initial: [string, string][]) {
  const disk = new Map(initial);
  const renames: [string, string][] = [];
  const removed: string[] = [];
  const read = (path: string) => {
    if (!disk.has(path)) throw new Error(`missing fixture file: ${path}`);
    return disk.get(path)!;
  };
  return {
    disk, renames, removed,
    existsSync: (path: string) => disk.has(path),
    mkdirSync: () => {},
    mkdtempSync: (prefix: string) => `${prefix}fixture`,
    readFileSync: read,
    copyFileSync: (from: string, to: string) => { disk.set(to, read(from)); },
    writeFileSync: (path: string, body: string) => { disk.set(path, body); },
    renameSync: (from: string, to: string) => {
      disk.set(to, read(from)); disk.delete(from); renames.push([from, to]);
    },
    rmSync: (path: string, options?: { recursive?: boolean }) => {
      removed.push(path);
      for (const key of disk.keys()) {
        if (key === path || (options?.recursive && key.startsWith(`${path}/`))) disk.delete(key);
      }
    },
  };
}

async function sync(options: Options = {}) {
  const fs = memoryFiles(options.noSnapshot ? [] : [[metadata, "old metadata"], [sources, "old sources"]]);
  const { disk } = fs;
  if (options.missingSnapshot) disk.delete(options.missingSnapshot);
  for (const [path, body] of options.extraFiles ?? []) disk.set(path, body);
  const requests: string[] = [];
  const messages: string[] = [];
  const exits: number[] = [];
  const exited = new Error("fixture process exited");
  const fetch = async (url: string) => {
    requests.push(url);
    if (url.includes("raw.githubusercontent.com")) {
      if (options.fault === "abort") return { ok: true, body: (async function* () {
        yield Buffer.from("a"); throw new Error("fixture stream aborted");
      })() };
      return response(options.fault === "oversize" ? "x".repeat(50_001) : options.raw ?? "abc", true);
    }
    if (url.includes("/users/")) return options.fault === "invalid-json"
      ? response('[{"name":', true) : response(options.listing ?? [repo]);
    if (url.includes("/git/trees/")) return response(options.tree ?? { tree: [entry], truncated: false });
    if (url.includes("/readme?")) return response(options.readme ?? { content: "IyBmaXh0dXJl", size: 9 });
    if (url.includes("/commits?")) return response([]);
    if (url.endsWith("/commits/main")) return response({ sha: revision });
    if (url.endsWith("/fixture-repo")) return response(options.visibility ?? repo);
    throw new Error(`Unexpected fixture request: ${url}`);
  };
  await script("fetch-projects.mjs", {
    ...fs,
    projectsConfig: config, boundedBody, isPublicProject, isSourceFile, fetch,
    mkdtempSync: (prefix: string) => {
      if (options.failStaging) throw new Error("fixture staging failure");
      return fs.mkdtempSync(prefix);
    },
    copyFileSync: (from: string, to: string) => {
      if (from === options.failBackup) {
        disk.set(to, "partial backup");
        throw new Error("fixture backup failure");
      }
      fs.copyFileSync(from, to);
    },
    writeFileSync: (path: string, body: string) => {
      if (path === options.failWrite) {
        disk.set(path, body.slice(0, 32));
        throw new Error("fixture ENOSPC after partial write");
      }
      fs.writeFileSync(path, body);
    },
    renameSync: (from: string, to: string) => {
      if (options.failRestore && from.endsWith(".old")) throw new Error("fixture restoration failure");
      if (to === options.failRename) throw new Error("fixture rename failure");
      fs.renameSync(from, to);
    },
    rmSync: (path: string, settings?: { recursive?: boolean }) => {
      if (options.failRemove && path === metadata) throw new Error("fixture removal failure");
      fs.rmSync(path, settings);
    },
    process: { env: options.offline ? { PORTFOLIO_OFFLINE: "1" } : {}, exit: (code: number) => { exits.push(code); throw exited; } },
    console: { log: (message: string) => messages.push(message), warn: (message: string) => messages.push(message), error: (message: string) => messages.push(message) },
  }).catch((error: unknown) => { if (error !== exited) throw error; });
  return { disk, requests, messages, exits, renames: fs.renames, removed: fs.removed };
}

// Execute the production script body with isolated imports. No real writes or fetches.
async function script(name: string, dependencies: Record<string, unknown>) {
  let source = readFileSync(join(process.cwd(), "scripts", name), "utf8")
    .replace(/^import .+;\n/gm, "")
    .replaceAll("import.meta.url", JSON.stringify(`file://${root}/scripts/${name}`));
  if (name === "fetch-projects.mjs") source = source.replace("(process.env.PORTFOLIO_OFFLINE", "return (process.env.PORTFOLIO_OFFLINE");
  return runInNewContext(`(async () => { ${source}\n })()`, {
    Buffer, AbortSignal, dirname, join, fileURLToPath, ...dependencies,
  }, { timeout: 1000 });
}

function retained(result: Awaited<ReturnType<typeof sync>>) {
  expect(result.messages.join("\n")).toContain("keeping the committed snapshot");
  expect(result.exits).toEqual([0]);
  expect(result.disk.get(metadata)).toBe("old metadata");
  expect(result.disk.get(sources)).toBe("old sources");
  expect([...result.disk.keys()].sort()).toEqual([metadata, sources].sort());
}

describe("round 1 public snapshot boundaries", () => {
  test("control publishes matching pinned metadata and source using only fixture requests", async () => {
    const result = await sync();
    expect(result.disk.get(metadata)).toContain(revision);
    expect(result.disk.get(sources)).toContain('"src/index.ts": "abc"');
    expect(result.requests).toHaveLength(7);
    expect(result.exits).toEqual([]);
    expect(result.messages.join("\n")).toContain("synced 1 projects");
    expect([...result.disk.keys()].sort()).toEqual([metadata, sources].sort());
  });

  test.each(["abort", "oversize", "invalid-json"] as const)("%s response retains both snapshots", async (fault) => {
    retained(await sync({ fault }));
  });

  test.each([
    { tree: [entry], truncated: true }, { tree: null },
    { tree: [{ ...entry, path: null }] }, { tree: [{ ...entry, path: 42 }] },
  ])("incomplete or malformed tree retains both snapshots: %j", async (tree) => {
    retained(await sync({ tree }));
  });

  test.each([join(githubStaging, "0.new"), join(githubStaging, "1.new")])("partial staging write failure retains the old pair: %s", async (failWrite) => {
    retained(await sync({ failWrite }));
  });

  test.each([metadata, sources])("partial backup failure retains the old pair: %s", async (failBackup) => {
    retained(await sync({ failBackup }));
  });

  test("staging creation failure retains both snapshots", async () => {
    retained(await sync({ failStaging: true }));
  });

  test("first rename failure retains both snapshots", async () => {
    retained(await sync({ failRename: metadata }));
  });

  test("second rename failure retains both snapshots before claiming fallback", async () => {
    const result = await sync({ failRename: sources });
    retained(result);
    expect(result.renames).toEqual([
      [join(githubStaging, "0.new"), metadata], [join(githubStaging, "0.old"), metadata],
    ]);
  });

  test("failed restoration exits nonzero and retains recovery files without claiming fallback", async () => {
    const result = await sync({ failRename: sources, failRestore: true });
    expect(result.exits).toEqual([1]);
    expect(result.messages.join("\n")).toContain(`restoration failed; recovery files at ${githubStaging}`);
    expect(result.messages.join("\n")).not.toMatch(/keeping the committed snapshot|synced/);
    expect(result.disk.get(sources)).toBe("old sources");
    expect(result.disk.get(join(githubStaging, "0.old"))).toBe("old metadata");
    expect(result.disk.get(join(githubStaging, "1.old"))).toBe("old sources");
    expect(result.removed).not.toContain(githubStaging);
  });

  test.each([
    { failWrite: join(githubStaging, "0.new") }, { failWrite: join(githubStaging, "1.new") },
    { failRename: metadata }, { failRename: sources },
  ])("failed first publication removes partial outputs and fails nonzero: %j", async (fault) => {
    const result = await sync({ noSnapshot: true, ...fault });
    expect(result.exits).toEqual([1]);
    expect(result.disk.size).toBe(0);
    expect(result.messages.join("\n")).not.toMatch(/keeping the committed snapshot|synced/);
  });

  test.each([metadata, sources])("an incomplete previous pair is restored without claiming fallback: missing %s", async (missingSnapshot) => {
    const result = await sync({ missingSnapshot, failRename: sources });
    expect(result.exits).toEqual([1]);
    expect([...result.disk.keys()]).toEqual([missingSnapshot === metadata ? sources : metadata]);
    expect(result.disk.get(missingSnapshot === metadata ? sources : metadata)).toBe(missingSnapshot === metadata ? "old sources" : "old metadata");
    expect(result.messages.join("\n")).not.toContain("keeping the committed snapshot");
  });

  test("rollback removal failure without a previous pair fails nonzero", async () => {
    const result = await sync({ noSnapshot: true, failRename: sources, failRemove: true });
    expect(result.exits).toEqual([1]);
    expect(result.messages.join("\n")).toContain("restoration failed");
    expect(result.messages.join("\n")).not.toMatch(/keeping the committed snapshot|synced/);
  });

  test("cleanup leaves other runs' staging files untouched", async () => {
    const other = join(dirname(metadata), ".github-snapshot-other/0.new");
    const legacy = `${metadata}.tmp`;
    const result = await sync({ failRename: sources, extraFiles: [[other, "other run"], [legacy, "legacy run"]] });
    expect(result.disk.get(metadata)).toBe("old metadata");
    expect(result.disk.get(sources)).toBe("old sources");
    expect(result.disk.get(other)).toBe("other run");
    expect(result.disk.get(legacy)).toBe("legacy run");
    expect(result.removed).toEqual([githubStaging]);
  });

  test("offline mode performs no requests or publication", async () => {
    const result = await sync({ offline: true });
    expect(result.requests).toEqual([]);
    expect(result.renames).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.exits).toEqual([]);
    expect(result.disk.get(metadata)).toBe("old metadata");
    expect(result.disk.get(sources)).toBe("old sources");
  });

  test("first successful acquisition publishes a complete pair", async () => {
    const result = await sync({ noSnapshot: true });
    expect(result.exits).toEqual([]);
    expect(result.disk.get(metadata)).toContain(revision);
    expect(result.disk.get(sources)).toContain('"src/index.ts": "abc"');
    expect([...result.disk.keys()].sort()).toEqual([metadata, sources].sort());
  });

  test("failed first acquisition exits unsuccessfully without publishing partial files", async () => {
    const result = await sync({ noSnapshot: true, fault: "abort" });
    expect(result.exits).toEqual([1]);
    expect(result.disk.size).toBe(0);
  });

  test.each([[null], [{ ...repo, topics: {} }], [{ ...repo, pushed_at: 42 }]])(
    "malformed listing metadata fails closed: %j", async (...items) => {
      retained(await sync({ listing: items }));
    },
  );

  test("visibility changed to private removes the project without requesting its source", async () => {
    const result = await sync({ visibility: { private: true, visibility: "private" } });
    expect(result.requests).toHaveLength(2);
    expect(result.disk.get(metadata)).toContain("= [];");
    expect(result.disk.get(sources)).toContain("= {};");
  });

  test("missing allowlisted repo currently publishes an empty pair without direct lookup", async () => {
    const result = await sync({ listing: [] });
    expect(result.requests).toHaveLength(1);
    expect(result.disk.get(metadata)).toContain("= [];");
    expect(result.messages.join("\n")).toContain("synced 0 projects");
  });

  test("clean short source currently passes without checking the tree blob size", async () => {
    const result = await sync({ raw: "a" });
    expect(result.disk.get(sources)).toContain('"src/index.ts": "a"');
    expect(result.messages.join("\n")).toContain("synced 1 projects");
  });

  test("prototype-sensitive path segments remain literal serialized keys", async () => {
    const paths = ["__proto__/a.ts", "constructor/a.ts", "prototype/a.ts"];
    const result = await sync({ tree: { tree: paths.map((path) => ({ ...entry, path })) } });
    for (const path of paths) expect(result.disk.get(sources)).toContain(JSON.stringify(path));
    expect(Object.prototype).not.toHaveProperty("a.ts");
  });

  test("excluded paths, binary bodies and symlinks never enter the snapshot", async () => {
    const paths = ["../a.ts", "/a.ts", "src//a.ts", "src/./a.ts", "src/../a.ts", "src/.hidden/a.ts"];
    const tree = { tree: [...paths.map((path) => ({ ...entry, path })), { ...entry, mode: "120000" }] };
    const excluded = await sync({ tree });
    expect(excluded.requests.some((url) => url.includes("raw.githubusercontent.com"))).toBe(false);
    expect((await sync({ raw: "a\0b" })).disk.get(sources)).toContain("= {};");
  });

  test("actual UTF-8 bytes and file count respect independent source caps", async () => {
    const tree = { tree: Array.from({ length: 30 }, (_, i) => ({ ...entry, path: `src/f${i}.ts`, size: 50_000 })) };
    const result = await sync({ tree, raw: "é".repeat(25_000) });
    expect(result.requests.filter((url) => url.includes("raw.githubusercontent.com"))).toHaveLength(2);
    expect(Buffer.byteLength(result.disk.get(sources)!)).toBeLessThan(121_000);
    const count = await sync({ tree: { tree: tree.tree.map((item) => ({ ...item, size: 3 })) } });
    expect(count.requests.filter((url) => url.includes("raw.githubusercontent.com"))).toHaveLength(25);
  });

  test("oversized decoded README falls back while keeping the project", async () => {
    const result = await sync({ readme: { size: 1, content: Buffer.from("x".repeat(100_001)).toString("base64") } });
    expect(result.disk.get(metadata)).not.toContain('"readme":');
    expect(result.disk.get(metadata)).toContain('"slug": "fixture-repo"');
  });
});

describe("round 1 stream lifecycle", () => {
  test("a rejected stream propagates the error and closes its iterator", async () => {
    let closed = false;
    const body = (async function* () { try { yield Buffer.from("abc"); throw new Error("aborted"); } finally { closed = true; } })();
    await expect(boundedBody({ body }, 10)).rejects.toThrow("aborted");
    expect(closed).toBe(true);
  });

  test("a budget breach cancels iteration before reading the next chunk", async () => {
    let reads = 0;
    let closed = false;
    const body = (async function* () { try { for (let i = 0; i < 3; i++) { reads++; yield Buffer.from("abc"); } } finally { closed = true; } })();
    await expect(boundedBody({ body }, 5)).rejects.toThrow("budget");
    expect(reads).toBe(2);
    expect(closed).toBe(true);
  });
});

describe("round 1 local source bundling", () => {
  async function bundle(fault?: "read" | "write" | "rename" | "staging", noSnapshot = false) {
    const other = join(dirname(site), ".site-source-other/site-source.ts");
    const fs = memoryFiles([[other, "other run"], ...(noSnapshot ? [] : [[site, "old site snapshot"] as [string, string]])]);
    const { disk } = fs;
    const run = script("bundle-source.mjs", {
      ...fs,
      sourceManifest: { fixture: ["src/fixture.ts"] }, mkdirSync: () => {},
      readFileSync: () => { if (fault === "read") throw new Error("fixture read failure"); return "abc"; },
      statSync: () => ({ size: 3 }), console: { log: () => {} },
      mkdtempSync: (prefix: string) => {
        if (fault === "staging") throw new Error("fixture staging failure");
        return fs.mkdtempSync(prefix);
      },
      writeFileSync: (path: string, body: string) => {
        disk.set(path, fault === "write" ? body.slice(0, 32) : body);
        if (fault === "write") throw new Error("fixture ENOSPC after partial write");
      },
      renameSync: (from: string, to: string) => {
        if (fault === "rename") throw new Error("fixture rename failure");
        fs.renameSync(from, to);
      },
    });
    const error = await run.then(() => null, (error: Error) => error);
    expect(disk.get(other)).toBe("other run");
    expect([...disk.keys()].some((path) => path.startsWith(`${siteStaging}/`))).toBe(false);
    return { disk, error, renames: fs.renames };
  }

  test("control serializes source and read failure leaves the snapshot intact", async () => {
    const good = await bundle();
    expect(good.error).toBeNull();
    expect(good.disk.get(site)).toContain('"src/fixture.ts":"abc"');
    expect(good.disk.get(site)).toContain("files: 1, bytes: 3");
    expect(good.renames).toEqual([[join(siteStaging, "site-source.ts"), site]]);
    const failed = await bundle("read");
    expect(failed.error?.message).toContain("read failure");
    expect(failed.disk.get(site)).toBe("old site snapshot");
  });

  test("partial output write failure preserves the committed site source snapshot", async () => {
    const failed = await bundle("write");
    expect(failed.error?.message).toContain("ENOSPC");
    expect(failed.disk.get(site)).toBe("old site snapshot");
  });

  test.each(["rename", "staging"] as const)("%s failure preserves the committed snapshot", async (fault) => {
    const failed = await bundle(fault);
    expect(failed.error?.message).toContain(`${fault} failure`);
    expect(failed.disk.get(site)).toBe("old site snapshot");
    expect(failed.renames).toEqual([]);
  });

  test.each(["write", "rename"] as const)("%s failure on first generation leaves no partial snapshot", async (fault) => {
    const failed = await bundle(fault, true);
    expect(failed.error).not.toBeNull();
    expect(failed.disk.has(site)).toBe(false);
  });
});

describe("round 1 README rendering", () => {
  function render(source: string) {
    return renderToStaticMarkup(createElement(Markdown, {
      source, repositoryUrl: "https://github.com/fixture-owner/fixture-repo", revision,
    }));
  }

  test("protocol payloads and raw HTML produce no active script, image or frame", () => {
    const html = render('[js](javascript:alert%281%29)\n\n[data](data:text/html,hello)\n\n![tracker](https://example.invalid/a.png)\n\n<iframe src="https://example.invalid"></iframe>\n\n<script>alert(1)</script>');
    expect(html).not.toMatch(/<(?:script|iframe|img)\b|href="(?:javascript|data):/i);
    expect(html).toContain('href="https://example.invalid/a.png"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  test("relative paths preserve the pinned revision and explicit web URLs remain external", () => {
    const html = render('[guide](docs/guide.md?mode=read#example)\n\n[web](https://example.invalid/docs)');
    expect(html).toContain(`/blob/${revision}/docs/guide.md?mode=read#example`);
    expect(html).toContain('href="https://example.invalid/docs"');
  });

  test("protocol-relative and escaped paths cannot create executable or off-origin links", () => {
    const html = render('[relative](//example.invalid/track)\n\n[escaped](%2e%2e/a.md)\n\n[blocked](vbscript:msgbox%281%29)');
    const document = new DOMParser().parseFromString(html, "text/html");
    for (const anchor of document.querySelectorAll("a")) {
      expect(new URL(anchor.href).origin).toBe("https://github.com");
    }
    expect(document.querySelectorAll("a")).toHaveLength(2);
  });

  test("maximum accepted README text and bounded dense markdown render finite output", () => {
    const plain = render("x".repeat(100_000));
    expect(plain.length).toBeLessThan(101_000);
    const dense = render("[x](a) ".repeat(1_000));
    expect((dense.match(/<a /g) ?? [])).toHaveLength(1_000);
    expect(dense.length).toBeLessThan(200_000);
  });
});
