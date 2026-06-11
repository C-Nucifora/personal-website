/**
 * Pull the projects from GitHub (data/projects-config.mjs) into a typed
 * module: repo metadata, the real README markdown, and recent commits (for
 * the `git log` egg). Runs on predev/prebuild so every build re-syncs; the
 * output is committed so offline builds and tests keep working — if GitHub
 * is unreachable the existing snapshot stays in place.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { projectsConfig } from "../data/projects-config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "data/generated/github-projects.ts");
const sourcesPath = join(root, "data/generated/github-sources.ts");

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "personal-website-build",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${path} → ${res.status}`);
  return res.json();
}

async function fetchReadme(user, repo) {
  const data = await gh(`/repos/${user}/${repo}/readme`);
  if (!data?.content) return null;
  return Buffer.from(data.content, "base64").toString("utf8");
}

/**
 * Curated source slice: download the repo tarball (one request), extract to
 * a temp dir, and keep the most interesting files within the byte budget —
 * shallow paths first, src/ before the rest.
 */
async function fetchSourceFiles(user, repo) {
  const cfg = projectsConfig.source;
  const res = await fetch(`https://api.github.com/repos/${user}/${repo}/tarball`, { headers });
  if (!res.ok) return {};
  const tmp = mkdtempSync(join(tmpdir(), `repo-${repo}-`));
  try {
    const tarPath = join(tmp, "repo.tar.gz");
    writeFileSync(tarPath, Buffer.from(await res.arrayBuffer()));
    execFileSync("tar", ["-xzf", tarPath, "-C", tmp]);

    // The tarball unpacks into a single "<user>-<repo>-<sha>" directory.
    const rootName = readdirSync(tmp).find((n) => n !== "repo.tar.gz");
    const repoRoot = join(tmp, rootName);

    const candidates = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const abs = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!cfg.excludeDirs.includes(entry.name)) walk(abs);
          continue;
        }
        const rel = relative(repoRoot, abs);
        if (!cfg.extensions.includes(extname(entry.name))) continue;
        if (cfg.excludeFiles.includes(entry.name)) continue;
        const size = statSync(abs).size;
        if (size === 0 || size > cfg.maxFileBytes) continue;
        candidates.push({ rel, abs, size });
      }
    };
    walk(repoRoot);

    // Shallow before deep, src/ before siblings at the same depth.
    candidates.sort((a, b) => {
      const da = a.rel.split("/").length;
      const db = b.rel.split("/").length;
      if (da !== db) return da - db;
      const sa = a.rel.startsWith("src/") ? 0 : 1;
      const sb = b.rel.startsWith("src/") ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return a.rel.localeCompare(b.rel);
    });

    const files = {};
    let bytes = 0;
    let count = 0;
    for (const c of candidates) {
      if (count >= cfg.maxFilesPerRepo || bytes + c.size > cfg.maxBytesPerRepo) break;
      files[c.rel] = readFileSync(c.abs, "utf8");
      bytes += c.size;
      count += 1;
    }
    return files;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

async function fetchCommits(user, repo, count) {
  const data = await gh(`/repos/${user}/${repo}/commits?per_page=${count}`);
  if (!Array.isArray(data)) return [];
  return data.map((c) => ({
    hash: c.sha.slice(0, 7),
    date: (c.commit?.author?.date ?? "").slice(0, 10),
    message: (c.commit?.message ?? "").split("\n")[0],
  }));
}

async function main() {
  const { username, exclude, featured, overrides, commitCount } = projectsConfig;

  const repos = await gh(`/users/${username}/repos?per_page=100&sort=pushed`);
  const wanted = repos.filter(
    (r) => !r.fork && !r.archived && !exclude.includes(r.name),
  );

  const projects = [];
  const sources = {};
  for (const r of wanted) {
    const over = overrides[r.name] ?? {};
    const [readme, commits, files] = await Promise.all([
      fetchReadme(username, r.name),
      fetchCommits(username, r.name, commitCount),
      fetchSourceFiles(username, r.name),
    ]);
    if (Object.keys(files).length) sources[r.name] = files;
    projects.push({
      slug: r.name,
      title: r.name,
      pitch:
        over.pitch ??
        r.description ??
        `${r.language ?? "Code"} project — see the README.`,
      stack: over.stack ?? [
        ...(r.language ? [r.language] : []),
        ...(r.topics ?? []).slice(0, 4),
      ],
      sourceUrl: r.html_url,
      ...(r.homepage ? { liveUrl: r.homepage } : {}),
      featured: featured.includes(r.name),
      stars: r.stargazers_count,
      pushedAt: (r.pushed_at ?? "").slice(0, 10),
      ...(readme ? { readme } : {}),
      commits,
    });
  }

  // Featured first (config order), then by recency.
  projects.sort((a, b) => {
    const fa = featured.indexOf(a.slug);
    const fb = featured.indexOf(b.slug);
    if (fa !== -1 || fb !== -1) {
      return (fa === -1 ? 99 : fa) - (fb === -1 ? 99 : fb);
    }
    return a.pushedAt < b.pushedAt ? 1 : -1;
  });

  const banner = `/**
 * GENERATED by scripts/fetch-projects.mjs — do not edit.
 * Synced from github.com/${username}; curate in data/projects-config.mjs
 * and run \`npm run fetch-projects\`.
 */
`;
  const body =
    banner +
    `export interface GithubCommit {\n  hash: string;\n  date: string;\n  message: string;\n}\n\n` +
    `export interface GithubProject {\n  slug: string;\n  title: string;\n  pitch: string;\n  stack: string[];\n  sourceUrl: string;\n  liveUrl?: string;\n  featured: boolean;\n  stars: number;\n  pushedAt: string;\n  readme?: string;\n  commits: GithubCommit[];\n}\n\n` +
    `export const githubProjects: GithubProject[] = ` +
    JSON.stringify(projects, null, 2) +
    `;\n`;

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, body);

  // Source slices live in their own module so the bundler can split them
  // into a lazy chunk — they're grafted into the vfs after boot, never on
  // the critical path.
  const srcBody =
    banner +
    `/** Curated source slices, slug → (repo path → contents). Lazy-loaded. */\n` +
    `export const githubSources: Record<string, Record<string, string>> = ` +
    JSON.stringify(sources, null, 2) +
    `;\n`;
  writeFileSync(sourcesPath, srcBody);

  const srcBytes = Object.values(sources).reduce(
    (n, files) => n + Object.values(files).reduce((m, f) => m + f.length, 0),
    0,
  );
  console.log(
    `synced ${projects.length} projects from github.com/${username} ` +
      `(${Object.keys(sources).length} with source, ${(srcBytes / 1024).toFixed(0)} KiB lazy)`,
  );
}

main().catch((err) => {
  if (existsSync(outPath)) {
    console.warn(`fetch-projects: ${err.message} — keeping the committed snapshot`);
    process.exit(0);
  }
  console.error(`fetch-projects: ${err.message} and no snapshot exists`);
  process.exit(1);
});
