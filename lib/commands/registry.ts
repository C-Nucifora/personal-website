/**
 * The command registry (FLOW.md §9). One module per command; the executor
 * resolves names and aliases here. Nav clicks and chips run the same
 * registry — there is no second code path.
 */
import type { ReactNode } from "react";
import type { VfsFile, VfsNode } from "@/lib/vfs/types";
import type { WindowKey } from "@/lib/terminal/types";

export interface CommandMeta {
  name: string;
  aliases: string[];
  description: string; // plain language, shown in help
  usage: string;
  /** Hidden commands (easter eggs) run but stay out of help/completion. */
  hidden?: boolean;
}

export interface CommandContext {
  args: string[];
  raw: string;

  /** Where the command runs. */
  cwd: string;
  prevCwd: string; // for `cd -`
  windowKey: WindowKey;

  // Virtual filesystem
  resolve(input: string): string; // input → canonical path against cwd
  node(path: string): VfsNode | null;
  read(path: string): VfsFile | null;
  list(path: string): VfsNode[] | null;

  // Effects — each dispatches through the one store
  write(node: ReactNode): void;
  clear(): void;
  setCwd(path: string): void;
  notify(text: string): void;
  confirmOpenUrl(url: string): void;
  runClick(cmd: string): void;

  history: string[];
  getThemeId(): string;
  setTheme(id: string): boolean;
  commands: CommandMeta[];
}

export interface CommandModule {
  meta: CommandMeta;
  /** Render the output. Return null for commands with no visible output. */
  run: (ctx: CommandContext) => ReactNode;
}

import { ls } from "./core/ls";
import { cd } from "./core/cd";
import { cat } from "./core/cat";
import { pwd } from "./core/pwd";
import { tree } from "./core/tree";
import { clear } from "./core/clear";
import { help } from "./core/help";
import { neofetch } from "./core/neofetch";
import { whoami } from "./core/whoami";
import { open } from "./core/open";
import { history } from "./core/history";
import { theme } from "./core/theme";
import { echo } from "./core/echo";
import { date } from "./core/date";
import { exit } from "./eggs/exit";

/** Registration order = help listing order; hidden eggs trail at the end. */
export const commandModules: CommandModule[] = [
  ls,
  cd,
  cat,
  pwd,
  tree,
  clear,
  help,
  neofetch,
  whoami,
  open,
  history,
  theme,
  echo,
  date,
  exit,
];

export const commandMetas: CommandMeta[] = commandModules.map((m) => m.meta);

const byName = new Map<string, CommandModule>();
for (const m of commandModules) {
  byName.set(m.meta.name.toLowerCase(), m);
  for (const a of m.meta.aliases) byName.set(a.toLowerCase(), m);
}

export function resolveCommand(name: string): CommandModule | undefined {
  return byName.get(name.trim().toLowerCase());
}

/** Every typeable token (names + aliases) of visible commands. */
export function completionCandidates(): string[] {
  return Array.from(byName.entries())
    .filter(([, m]) => !m.meta.hidden)
    .map(([name]) => name)
    .sort();
}
