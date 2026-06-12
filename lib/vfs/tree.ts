/**
 * The virtual filesystem: one plain typed tree built at module load
 * (FLOW.md §2, §12.3). No async, no fetching — commands resolve paths
 * against this synchronously.
 */
import { projects } from "@/data/projects";
import { blogPosts } from "@/data/generated/blog";
import { siteSource } from "@/data/generated/site-source";
import { experience } from "@/data/resume";
import { bashrc, nothingToSeeHere, vimrc } from "@/data/dotfiles";
import { commandsMd, guideMd, keybindingsMd } from "@/data/help-docs";
import { profile } from "@/data/profile";
import {
  aboutMd,
  blogPostMd,
  contactMd,
  etcPasswd,
  experiencePageMd,
  planText,
  projectReadmeMd,
  resumeMd,
  resumePdfSummary,
  slugify,
  usesMd,
} from "./builders";
import { HOME, normalizePath } from "./path";
import type { VfsDir, VfsFile, VfsLanguage, VfsNode } from "./types";

function file(
  name: string,
  raw: string,
  extra: Partial<Omit<VfsFile, "kind" | "name" | "raw">> = {},
): VfsFile {
  const language: VfsLanguage = extra.language ?? (name.endsWith(".md") ? "markdown" : "text");
  return { kind: "file", name, raw, ...extra, language };
}

function dir(name: string, children: VfsNode[], extra: Partial<VfsDir> = {}): VfsDir {
  return { kind: "dir", name, children, ...extra };
}

const EXT_LANGUAGE: Record<string, VfsLanguage> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  css: "css",
  html: "html",
  md: "markdown",
};

function languageFor(name: string): VfsLanguage {
  const ext = name.split(".").pop() ?? "";
  return EXT_LANGUAGE[ext] ?? "text";
}

/** Mount path → contents entries into a directory, creating subdirs. */
function mountFiles(target: VfsDir, files: Record<string, string>): void {
  for (const [path, raw] of Object.entries(files)) {
    const segments = path.split("/");
    const name = segments.pop()!;
    let cursor = target;
    for (const seg of segments) {
      let next = cursor.children.find(
        (c): c is VfsDir => c.kind === "dir" && c.name === seg,
      );
      if (!next) {
        next = dir(seg, []);
        cursor.children.push(next);
      }
      cursor = next;
    }
    cursor.children.push(file(name, raw, { language: languageFor(name) }));
  }
}

/** Build a project's src/ tree from its bundled files (FLOW §8). */
function srcTree(files: Record<string, string>): VfsDir {
  const root = dir("src", []);
  mountFiles(root, files);
  return root;
}

function buildHome(): VfsDir {
  return dir("christian", [
    dir("about", [
      file("about.md", aboutMd(), { render: "about" }),
      file("uses.md", usesMd(), { render: "uses" }),
    ]),
    dir(
      "projects",
      projects.map((p) => {
        // Local bundle (this site) mounts now; GitHub source slices graft in
        // lazily after boot — see graftProjectSources below.
        const bundled = siteSource[p.slug];
        return dir(p.slug, [
          file("README.md", projectReadmeMd(p), { render: "project-readme", meta: p.slug }),
          ...(bundled ? [srcTree(bundled)] : []),
        ]);
      }),
    ),
    dir("resume", [
      file("resume.md", resumeMd(), { render: "resume" }),
      file("resume.pdf", resumePdfSummary(), { download: profile.resumePdf }),
      dir(
        "experience",
        experience.map((e) => file(`${slugify(e.org)}.md`, experiencePageMd(e))),
      ),
    ]),
    dir("contact", [file("contact.md", contactMd(), { render: "contact" })]),
    dir("help", [
      file("guide.md", guideMd),
      file("commands.md", commandsMd),
      file("keybindings.md", keybindingsMd),
    ]),
    // Dormant until the first post (spec 2026-06-12): no posts, no ~/blog.
    ...(blogPosts.length
      ? [dir("blog", blogPosts.map((p) => file(`${p.slug}.md`, blogPostMd(p))))]
      : []),
    file(".bashrc", bashrc, { hidden: true }),
    file(".plan", planText(), { hidden: true }),
    file(".vimrc", vimrc, { hidden: true }),
    dir(".secrets", [file("nothing_to_see_here.txt", nothingToSeeHere)], { hidden: true }),
  ]);
}

const ROOT: VfsDir = dir("/", [
  dir("home", [buildHome()]),
  dir("etc", [file("passwd", etcPasswd())]),
]);

/** Resolve a canonical-or-not path to its node; null = ENOENT. */
export function resolveNode(path: string): VfsNode | null {
  const normalized = normalizePath(path);
  const absolute = normalized === "~" ? HOME : normalized.startsWith("~/")
    ? HOME + normalized.slice(1)
    : normalized;

  let node: VfsNode = ROOT;
  for (const seg of absolute.split("/").filter(Boolean)) {
    if (node.kind !== "dir") return null;
    const next: VfsNode | undefined = node.children.find((c) => c.name === seg);
    if (!next) return null;
    node = next;
  }
  return node;
}

export function readFile(path: string): VfsFile | null {
  const node = resolveNode(path);
  return node?.kind === "file" ? node : null;
}

export function listDir(path: string): VfsNode[] | null {
  const node = resolveNode(path);
  return node?.kind === "dir" ? node.children : null;
}

/**
 * Mount lazily-loaded GitHub source slices into ~/projects/<slug>/, keeping
 * each repo's real layout (Cargo.toml at the root, its own src/ where it has
 * one). The chunk stays off the critical path; the terminal grafts it right
 * after boot (Terminal.tsx). Idempotent per slug.
 */
const grafted = new Set<string>();

export function graftProjectSources(sources: Record<string, Record<string, string>>): void {
  const projectsDir = resolveNode("~/projects");
  if (projectsDir?.kind !== "dir") return;
  for (const [slug, files] of Object.entries(sources)) {
    if (grafted.has(slug)) continue;
    const projectDir = projectsDir.children.find(
      (n): n is VfsDir => n.kind === "dir" && n.name === slug,
    );
    if (!projectDir) continue;
    grafted.add(slug);
    mountFiles(projectDir, files);
  }
}
