import type { ReactNode } from "react";
import type { CommandContext, CommandMeta, CommandModule } from "./types";

import { help } from "./help";
import { about } from "./about";
import { now } from "./now";
import { uses } from "./uses";
import { neofetch } from "./neofetch";
import { resume } from "./resume";
import { experience } from "./experience";
import { projects } from "./projects";
import { contact } from "./contact";
import { socials } from "./socials";
import { copy } from "./copy";
import { homelab } from "./homelab";
import { theme } from "./theme";
import { themes } from "./themes";
import { clear } from "./clear";
import { whoami } from "./whoami";
import { man } from "./man";
import { ls } from "./ls";
import { cd } from "./cd";
import { pwd } from "./pwd";
import { cat } from "./cat";
import { echo } from "./echo";
import { history } from "./history";
import { sudo } from "./sudo";
import { sl } from "./sl";
import { cowsay } from "./cowsay";
import { exit } from "./exit";

/** Registration order = the order commands appear where iterated. */
export const commandModules: CommandModule[] = [
  help,
  about,
  now,
  uses,
  neofetch,
  resume,
  experience,
  projects,
  contact,
  socials,
  copy,
  homelab,
  theme,
  themes,
  clear,
  whoami,
  man,
  ls,
  cd,
  pwd,
  cat,
  echo,
  history,
  sudo,
  sl,
  cowsay,
  exit,
];

export const commandMetas: CommandMeta[] = commandModules.map((m) => m.meta);

/** name + alias → module, for fast case-insensitive resolution. */
const byName = new Map<string, CommandModule>();
for (const m of commandModules) {
  byName.set(m.meta.name.toLowerCase(), m);
  for (const a of m.meta.aliases) byName.set(a.toLowerCase(), m);
}

export function resolveCommand(name: string): CommandModule | undefined {
  return byName.get(name.trim().toLowerCase());
}

/** Every typeable token (names + aliases), for Tab-completion. */
export function completionCandidates(): string[] {
  return Array.from(byName.keys()).sort();
}

/** Session-level handles the Terminal supplies for each run. */
export type SessionActions = Omit<CommandContext, "args" | "raw" | "commands">;

export interface RunResult {
  /** What to show in the log (may be null, e.g. for `clear`). */
  node: ReactNode;
  /** The command name that resolved, or null if unknown. */
  resolved: string | null;
}

function NotFound({ name, onRun }: { name: string; onRun: (input: string) => void }) {
  return (
    <p className="text-error">
      I don&apos;t know &ldquo;{name}&rdquo; yet. Type{" "}
      <button
        type="button"
        onClick={() => onRun("help")}
        className="text-accent underline-offset-2 hover:underline"
      >
        help
      </button>{" "}
      to see what I can do.
    </p>
  );
}

/** Parse a raw line, dispatch to the right command, and return its output. */
export function runCommandLine(raw: string, actions: SessionActions): RunResult {
  const trimmed = raw.trim();
  const name = trimmed.split(/\s+/)[0] ?? "";
  const args = trimmed.split(/\s+/).slice(1);
  const mod = resolveCommand(name);

  if (!mod) {
    return { node: <NotFound name={name} onRun={actions.run} />, resolved: null };
  }

  const ctx: CommandContext = { ...actions, args, raw: trimmed, commands: commandMetas };
  return { node: mod.run(ctx), resolved: mod.meta.name };
}
