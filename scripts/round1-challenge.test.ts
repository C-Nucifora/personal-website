import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { describe, expect, test } from "vitest";

const root = "/portfolio-challenge-fixture";
const generated = join(root, "data/generated");
const metadata = join(generated, "github-projects.ts");
const sources = join(generated, "github-sources.ts");
const site = join(generated, "site-source.ts");
const foreign = join(generated, ".github-snapshot-other/0.old");

type Faults = { publish?: boolean; restore?: boolean; cleanup?: boolean; partialWrite?: boolean };

function memoryFiles(initial: Array<[string, string]>) {
  const disk = new Map(initial);
  const removed: string[] = [];
  const stages: string[] = [];
  let faults: Faults = {};
  let sequence = 0;
  const read = (path: string) => {
    if (!disk.has(path)) throw new Error(`missing synthetic file ${path}`);
    return disk.get(path)!;
  };
  return {
    disk, removed, stages,
    fault(next: Faults) { faults = next; },
    bindings: {
      existsSync: (path: string) => disk.has(path),
      mkdirSync: () => {},
      mkdtempSync: (prefix: string) => {
        const path = `${prefix}${++sequence}`;
        stages.push(path);
        return path;
      },
      readFileSync: read,
      statSync: (path: string) => ({ size: Buffer.byteLength(read(path)) }),
      copyFileSync: (from: string, to: string) => { disk.set(to, read(from)); },
      writeFileSync: (path: string, body: string) => {
        if (faults.partialWrite) {
          disk.set(path, body.slice(0, 17));
          throw new Error("synthetic partial staging write");
        }
        disk.set(path, body);
      },
      renameSync: (from: string, to: string) => {
        if (faults.restore && from.endsWith(".old")) throw new Error("synthetic restore failure");
        if (faults.publish && (to === sources || to === site)) throw new Error("synthetic publication failure");
        disk.set(to, read(from));
        disk.delete(from);
      },
      rmSync: (path: string, options?: { recursive?: boolean }) => {
        removed.push(path);
        if (faults.cleanup && stages.includes(path)) throw new Error("synthetic cleanup failure");
        for (const key of disk.keys()) {
          if (key === path || (options?.recursive && key.startsWith(`${path}/`))) disk.delete(key);
        }
      },
    },
  };
}

// Read production code, but give every filesystem mutation and request a synthetic binding.
async function script(name: string, dependencies: Record<string, unknown>) {
  let source = readFileSync(join(process.cwd(), "scripts", name), "utf8")
    .replace(/^import .+;\n/gm, "")
    .replaceAll("import.meta.url", JSON.stringify(`file://${root}/scripts/${name}`));
  if (name === "fetch-projects.mjs") {
    source = source.replace("(process.env.PORTFOLIO_OFFLINE", "return (process.env.PORTFOLIO_OFFLINE");
  }
  return runInNewContext(`(async () => { ${source}\n })()`, {
    Buffer, AbortSignal, dirname, join, fileURLToPath,
    fetch: () => { throw new Error("unexpected synthetic request"); },
    ...dependencies,
  }, { timeout: 1000 });
}

async function publish(fs: ReturnType<typeof memoryFiles>) {
  const messages: string[] = [];
  const exits: number[] = [];
  const requests: string[] = [];
  const exited = new Error("synthetic process exit");
  await script("fetch-projects.mjs", {
    ...fs.bindings,
    projectsConfig: { username: "fixture", featured: [], overrides: {}, commitCount: 0 },
    // An empty public listing still exercises both real generated outputs and all publication code.
    fetch: async (url: string) => {
      requests.push(url);
      if (url !== "https://api.github.com/users/fixture/repos?per_page=100&sort=pushed") {
        throw new Error(`unexpected synthetic request ${url}`);
      }
      return { ok: true, status: 200 };
    },
    boundedBody: async () => Buffer.from("[]"),
    isPublicProject: () => { throw new Error("empty listing must not call repository policy"); },
    process: { env: {}, exit: (code: number) => { exits.push(code); throw exited; } },
    console: {
      log: (text: string) => messages.push(text),
      warn: (text: string) => messages.push(text),
      error: (text: string) => messages.push(text),
    },
  }).catch((error: unknown) => { if (error !== exited) throw error; });
  expect(requests).toHaveLength(1);
  return { messages: messages.join("\n"), exits };
}

function oldPair() {
  return memoryFiles([[metadata, "old metadata"], [sources, "old sources"], [foreign, "other owner recovery"]]);
}

describe("round 1 challenge snapshot cleanup and recovery", () => {
  test("control publishes a complete pair and leaves another recovery directory alone", async () => {
    const fs = oldPair();
    const result = await publish(fs);
    expect(result.exits).toEqual([]);
    expect(result.messages).toContain("synced 0 projects");
    expect(fs.disk.get(metadata)).toContain("export const githubProjects");
    expect(fs.disk.get(sources)).toContain("export const githubSources");
    expect([...fs.disk.keys()].sort()).toEqual([metadata, sources, foreign].sort());
    expect(fs.disk.get(foreign)).toBe("other owner recovery");
  });

  test("cleanup failure after publication keeps the complete new pair and reports failure", async () => {
    const fs = oldPair();
    fs.fault({ cleanup: true });
    const result = await publish(fs);
    expect(result.exits).toEqual([1]);
    expect(result.messages).toContain("synthetic cleanup failure");
    expect(result.messages).not.toMatch(/keeping the committed snapshot|synced/);
    expect(fs.disk.get(metadata)).toContain("export const githubProjects");
    expect(fs.disk.get(sources)).toContain("export const githubSources");
    expect(fs.disk.get(join(fs.stages[0], "0.old"))).toBe("old metadata");
    expect(fs.disk.get(join(fs.stages[0], "1.old"))).toBe("old sources");
    expect(fs.disk.get(foreign)).toBe("other owner recovery");
  });

  test("cleanup failure after successful rollback never leaves a mixed public pair", async () => {
    const fs = oldPair();
    fs.fault({ publish: true, cleanup: true });
    const result = await publish(fs);
    expect(result.exits).toEqual([0]);
    expect(result.messages).toContain("keeping the committed snapshot");
    expect(fs.disk.get(metadata)).toBe("old metadata");
    expect(fs.disk.get(sources)).toBe("old sources");
    expect(fs.disk.get(foreign)).toBe("other owner recovery");
  });

  test("failed restoration preserves recovery bytes even when cleanup would also fail", async () => {
    const fs = oldPair();
    fs.fault({ publish: true, restore: true, cleanup: true });
    const result = await publish(fs);
    expect(result.exits).toEqual([1]);
    expect(result.messages).toContain(`restoration failed; recovery files at ${fs.stages[0]}`);
    expect(result.messages).not.toMatch(/keeping the committed snapshot|synced/);
    expect(fs.removed).toEqual([]);
    expect(fs.disk.get(join(fs.stages[0], "0.old"))).toBe("old metadata");
    expect(fs.disk.get(join(fs.stages[0], "1.old"))).toBe("old sources");
  });

  test("a later successful invocation leaves earlier failed-restoration evidence untouched", async () => {
    const fs = oldPair();
    fs.fault({ publish: true, restore: true });
    expect((await publish(fs)).exits).toEqual([1]);
    const recovery = [...fs.disk.entries()].filter(([path]) => path.startsWith(`${fs.stages[0]}/`));
    fs.fault({});
    expect((await publish(fs)).exits).toEqual([]);
    expect(fs.stages[1]).not.toBe(fs.stages[0]);
    for (const [path, body] of recovery) expect(fs.disk.get(path)).toBe(body);
    expect(fs.disk.get(metadata)).toContain("export const githubProjects");
    expect(fs.disk.get(sources)).toContain("export const githubSources");
    expect(fs.disk.get(foreign)).toBe("other owner recovery");
  });
});

describe("round 1 challenge local bundle cleanup", () => {
  test.each(["partialWrite", "publish", "cleanup"] as const)("%s failure preserves a complete old or new snapshot", async (fault) => {
    const input = join(root, "src/fixture.ts");
    const fs = memoryFiles([[site, "old site snapshot"], [input, "export const fixture = 1;"], [foreign, "other owner recovery"]]);
    fs.fault({ [fault]: true, cleanup: true });
    await expect(script("bundle-source.mjs", {
      ...fs.bindings,
      sourceManifest: { "fixture-repo": ["src/fixture.ts"] },
      console: { log: () => { throw new Error("must not report bundle success"); } },
    })).rejects.toThrow("synthetic cleanup failure");
    if (fault === "cleanup") {
      expect(fs.disk.get(site)).toContain('"src/fixture.ts":"export const fixture = 1;"');
      expect(fs.disk.get(site)).toContain("export const bundleInfo = { files: 1, bytes: 25 }");
    } else expect(fs.disk.get(site)).toBe("old site snapshot");
    expect(fs.disk.get(foreign)).toBe("other owner recovery");
  });
});
