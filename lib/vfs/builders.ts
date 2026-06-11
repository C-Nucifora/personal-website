/**
 * Markdown/text generators for virtual filesystem files. Content stays
 * single-source in data/ — these templates turn the typed objects into the
 * raw text the vim viewer shows and `cat` falls back to.
 */
import { stripTodo, stripTodoList } from "@/lib/strip-todo";
import { profile } from "@/data/profile";
import { socials } from "@/data/socials";
import { now } from "@/data/now";
import { uses } from "@/data/uses";
import { education, experience, skills, type ResumeEntry } from "@/data/resume";
import type { Project } from "@/data/projects";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function aboutMd(): string {
  return [
    `# ${profile.name}`,
    "",
    `> ${stripTodo(profile.tagline)}`,
    "",
    `**${stripTodo(profile.role)}** · ${stripTodo(profile.location)}`,
    "",
    ...stripTodoList(profile.about).flatMap((p) => [p, ""]),
    `More: [uses.md](uses.md) — the tools this gets built with.`,
  ].join("\n");
}

export function usesMd(): string {
  const sections = uses.flatMap((g) => [
    `## ${g.group}`,
    "",
    ...stripTodoList(g.items).map((i) => `- ${i}`),
    "",
  ]);
  return ["# Uses", "", "The gear and software I rely on.", "", ...sections].join("\n");
}

function resumeEntryMd(e: ResumeEntry): string[] {
  const where = e.location ? ` · ${stripTodo(e.location)}` : "";
  return [
    `### ${stripTodo(e.title)} — ${stripTodo(e.org)}`,
    "",
    `${e.start}–${e.end}${where}`,
    "",
    ...stripTodoList(e.bullets).map((b) => `- ${b}`),
    "",
  ];
}

export function resumeMd(): string {
  return [
    `# Resume — ${profile.name}`,
    "",
    `${stripTodo(profile.role)} · ${stripTodo(profile.location)} · ${profile.email}`,
    "",
    "## Experience",
    "",
    ...experience.flatMap(resumeEntryMd),
    "## Education",
    "",
    ...education.flatMap(resumeEntryMd),
    "## Skills",
    "",
    ...skills.map((s) => `- **${s.group}:** ${stripTodoList(s.items).join(", ")}`),
    "",
    `Per-role detail lives in [experience/](experience/). PDF: [resume.pdf](resume.pdf).`,
  ].join("\n");
}

export function resumePdfSummary(): string {
  return [
    `${profile.name} — ${stripTodo(profile.role)}`,
    "",
    "This is a PDF. The terminal prints this summary; click the file name",
    "(or the link below) to download the real thing.",
  ].join("\n");
}

export function experiencePageMd(e: ResumeEntry): string {
  const where = e.location ? ` · ${stripTodo(e.location)}` : "";
  return [
    `# ${stripTodo(e.org)}`,
    "",
    `**${stripTodo(e.title)}** · ${e.start}–${e.end}${where}`,
    "",
    ...stripTodoList(e.bullets).map((b) => `- ${b}`),
    "",
    "Back to the overview: [../resume.md](../resume.md)",
  ].join("\n");
}

export function contactMd(): string {
  const rows = socials.map((s) => `- **${s.label}:** [${s.handle}](${s.url})`);
  return [
    "# Contact",
    "",
    `The fastest way is email: [${profile.email}](mailto:${profile.email})`,
    "",
    ...rows,
    `- **Homelab:** [dashboard](${profile.homelabUrl})`,
    "",
    "No forms, no funnels. A reply is usually quick.",
  ].join("\n");
}

export function planText(): string {
  return [
    `Last update: ${now.updated}`,
    "",
    ...stripTodoList(now.items).map((i) => `* ${i}`),
  ].join("\n");
}

export function projectReadmeMd(p: Project): string {
  if (p.readme) return p.readme;
  const links: string[] = [];
  if (p.liveUrl) links.push(`**Live:** ${p.liveUrl}`);
  if (p.sourceUrl) links.push(`**Source:** ${p.sourceUrl}`);
  return [
    `# ${p.title}`,
    "",
    p.pitch,
    "",
    ...(p.description ? [p.description, ""] : []),
    `**Stack:** ${p.stack.join(" · ")}`,
    "",
    ...(links.length ? [links.join(" · "), ""] : []),
  ].join("\n");
}

export function etcPasswd(): string {
  return [
    "root:x:0:0:root:/root:/bin/zsh",
    `christian:x:1000:1000:${profile.name}:/home/christian:/bin/zsh`,
    "impostor_syndrome:x:1001:1001:visits occasionally:/home/christian:/bin/zsh",
    "coffee:x:1002:1002:load-bearing:/var/lib/coffee:/usr/sbin/nologin",
    "visitor:x:1003:1003:hello there:/tmp:/bin/zsh",
  ].join("\n");
}
