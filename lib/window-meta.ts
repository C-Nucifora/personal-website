/**
 * Per-window SEO copy. The window routes are real static pages — without
 * their own titles and descriptions, search engines see five duplicates of
 * the homepage. Consumed by app/[window]/page.tsx and app/sitemap.ts.
 */
import { profile } from "@/data/profile";
import type { WindowId } from "@/lib/vfs/types";

export interface WindowMeta {
  title: string;
  description: string;
}

export const WINDOW_META: Record<WindowId, WindowMeta> = {
  about: {
    title: `About — ${profile.name}`,
    description: `Who ${profile.name} is — background, interests, and the tools he uses.`,
  },
  projects: {
    title: `Projects — ${profile.name}`,
    description: `Projects by ${profile.name}, with browsable source pulled straight from GitHub.`,
  },
  resume: {
    title: `Resume — ${profile.name}`,
    description: `${profile.name}'s resume — experience, skills, and education, with a printable version.`,
  },
  contact: {
    title: `Contact — ${profile.name}`,
    description: `How to reach ${profile.name} — email and links.`,
  },
  help: {
    title: `Help — ${profile.name}`,
    description: "How to navigate this terminal-style portfolio: commands, keybindings, and a guided tour.",
  },
  blog: {
    title: `Blog — ${profile.name}`,
    description: `Notes and write-ups by ${profile.name}.`,
  },
};
