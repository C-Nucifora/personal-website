/**
 * Pull the projects from GitHub (data/projects-config.mjs) into a typed
 * module: repo metadata, the real README markdown, and recent commits (for
 * the `git log` egg). Run manually with npm run fetch-projects; the
 * output is committed so offline builds and tests keep working — if GitHub
 * is unreachable the existing snapshot stays in place.
 */
import { existsSync, mkdirSync, mkdtempSync, copyFileSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { boundedBody, isPublicProject, isSourceFile } from "./project-safety.mjs";
import { projectsConfig } from "../data/projects-config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "data/generated/github-projects.ts");
const sourcesPath = join(root, "data/generated/github-sources.ts");
let snapshotRetained = false;

function publishSnapshots(entries) {
  const staging = mkdtempSync(join(dirname(outPath), ".github-snapshot-"));
  const previous = new Set();
  const published = [];
  const hadSnapshot = snapshotRetained;
  let retainRecovery = false;
  try {
    for (const [i, { path, body }] of entries.entries()) {
      if (existsSync(path)) {
        copyFileSync(path, join(staging, `${i}.old`));
        previous.add(i);
      }
      writeFileSync(join(staging, `${i}.new`), body);
    }
    // Recover caught failures; these two renames are not a crash-safe transaction.
    snapshotRetained = false;
    for (const [i, { path }] of entries.entries()) {
      renameSync(join(staging, `${i}.new`), path);
      published.push(i);
    }
  } catch (error) {
    const errors = [error];
    for (const i of published.reverse()) {
      try {
        if (previous.has(i)) renameSync(join(staging, `${i}.old`), entries[i].path);
        else rmSync(entries[i].path, { force: true });
      } catch (restoreError) {
        errors.push(restoreError);
      }
    }
    if (errors.length > 1) {
      retainRecovery = true;
      throw new AggregateError(errors, `Snapshot restoration failed; recovery files at ${staging}`);
    }
    snapshotRetained = hadSnapshot;
    throw error;
  } finally {
    if (!retainRecovery) rmSync(staging, { recursive: true, force: true });
  }
}

// Public portfolio data must never depend on authenticated repository access.
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "personal-website-build",
};
const timeout = () => AbortSignal.timeout(30_000);

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers, signal: timeout() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${path} → ${res.status}`);
  return JSON.parse((await boundedBody(res, 2_000_000)).toString("utf8"));
}

async function fetchReadme(user, repo, ref) {
  const data = await gh(`/repos/${user}/${repo}/readme?ref=${ref}`);
  if (!data?.content || data.size > 100_000) return null;
  const decoded = Buffer.from(data.content, "base64");
  return decoded.length <= 100_000 ? decoded.toString("utf8") : null;
}

/** Read only regular public Git blobs. Never extract an untrusted archive. */
async function fetchSourceFiles(user, repo, ref) {
  const cfg = projectsConfig.source;
  const tree = await gh(`/repos/${user}/${repo}/git/trees/${ref}?recursive=1`);
  if (!Array.isArray(tree?.tree) || tree.truncated) throw new Error("Incomplete public source tree");
  const candidates = tree.tree.filter((entry) => isSourceFile(entry, cfg)).sort((a, b) => {
    const depth = a.path.split("/").length - b.path.split("/").length;
    return depth || Number(b.path.startsWith("src/")) - Number(a.path.startsWith("src/")) || a.path.localeCompare(b.path);
  });
  const files = {};
  let bytes = 0;
  for (const entry of candidates) {
    if (Object.keys(files).length >= cfg.maxFilesPerRepo) break;
    if (bytes + entry.size > cfg.maxBytesPerRepo) continue;
    const path = entry.path.split("/").map(encodeURIComponent).join("/");
    const res = await fetch(`https://raw.githubusercontent.com/${user}/${repo}/${ref}/${path}`, { signal: timeout() });
    if (!res.ok) throw new Error(`Public source unavailable: ${repo}/${entry.path}`);
    const body = await boundedBody(res, cfg.maxFileBytes);
    if (bytes + body.length > cfg.maxBytesPerRepo || body.includes(0)) continue;
    files[entry.path] = body.toString("utf8");
    bytes += body.length;
  }
  return files;
}

async function fetchCommits(user, repo, count, ref) {
  const data = await gh(`/repos/${user}/${repo}/commits?per_page=${count}&sha=${ref}`);
  if (!Array.isArray(data)) return [];
  return data.map((c) => ({
    hash: c.sha.slice(0, 7),
    date: (c.commit?.author?.date ?? "").slice(0, 10),
    message: (c.commit?.message ?? "").split("\n")[0].slice(0, 200),
  }));
}

async function main() {
  snapshotRetained = existsSync(outPath) && existsSync(sourcesPath);
  const { username, featured, overrides, commitCount } = projectsConfig;

  const repos = await gh(`/users/${username}/repos?per_page=100&sort=pushed`);
  if (!Array.isArray(repos)) throw new Error("Invalid public repository listing");
  const wanted = repos.filter((repo) => isPublicProject(repo, projectsConfig));

  const projects = [];
  const sources = {};
  for (const r of wanted) {
    const visibility = await gh(`/repos/${username}/${r.name}`);
    if (visibility?.private !== false || visibility?.visibility !== "public") continue;
    const revision = await gh(`/repos/${username}/${r.name}/commits/${visibility.default_branch}`);
    const ref = revision?.sha;
    if (!/^[a-f0-9]{40}$/.test(ref ?? "")) throw new Error("Invalid public repository revision");
    const over = overrides[r.name] ?? {};
    const [readme, commits, files] = await Promise.all([
      fetchReadme(username, r.name, ref),
      fetchCommits(username, r.name, commitCount, ref),
      fetchSourceFiles(username, r.name, ref),
    ]);
    if (Object.keys(files).length) sources[r.name] = files;
    projects.push({
      slug: r.name,
      revision: ref,
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
      ...(/^https?:\/\//.test(r.homepage ?? "") ? { liveUrl: r.homepage } : {}),
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
    `export interface GithubProject {\n  slug: string;\n  revision: string;\n  title: string;\n  pitch: string;\n  stack: string[];\n  sourceUrl: string;\n  liveUrl?: string;\n  featured: boolean;\n  stars: number;\n  pushedAt: string;\n  readme?: string;\n  commits: GithubCommit[];\n}\n\n` +
    `export const githubProjects: GithubProject[] = ` +
    JSON.stringify(projects, null, 2) +
    `;\n`;

  mkdirSync(dirname(outPath), { recursive: true });

  // Source slices live in their own module so the bundler can split them
  // into a lazy chunk — they're grafted into the vfs after boot, never on
  // the critical path.
  const srcBody =
    banner +
    `/** Curated source slices, slug → (repo path → contents). Lazy-loaded. */\n` +
    `export const githubSources: Record<string, Record<string, string>> = ` +
    JSON.stringify(sources, null, 2) +
    `;\n`;
  publishSnapshots([{ path: outPath, body }, { path: sourcesPath, body: srcBody }]);

  const srcBytes = Object.values(sources).reduce(
    (n, files) => n + Object.values(files).reduce((m, f) => m + f.length, 0),
    0,
  );
  console.log(
    `synced ${projects.length} projects from github.com/${username} ` +
      `(${Object.keys(sources).length} with source, ${(srcBytes / 1024).toFixed(0)} KiB lazy)`,
  );
}

(process.env.PORTFOLIO_OFFLINE === "1" ? Promise.resolve() : main()).catch((err) => {
  if (snapshotRetained && existsSync(outPath) && existsSync(sourcesPath)) {
    console.warn(`fetch-projects: ${err.message} — keeping the committed snapshot`);
    process.exit(0);
  }
  console.error(`fetch-projects: ${err.message}; no usable fallback snapshot`);
  process.exit(1);
});
