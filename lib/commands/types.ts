import type { ReactNode } from "react";

/** Help groups, in the order help should present them. */
export const GROUP_ORDER = [
  "Get to know me",
  "My work",
  "Reach me",
  "Elsewhere",
  "Customize",
  "System",
] as const;

export type CommandGroup = (typeof GROUP_ORDER)[number];

export interface CommandMeta {
  name: string;
  aliases: string[];
  description: string; // plain-language, shown in help
  usage: string;
  group: CommandGroup;
  /** Omit from the grouped help listing (still runnable). */
  hidden?: boolean;
}

/** Side-effect handles + parsed input handed to every command. */
export interface CommandContext {
  args: string[]; // tokens after the command name
  raw: string; // the full raw input line, trimmed

  // Session actions
  clear: () => void;
  /** Run another command line programmatically (used by "show everything"). */
  run: (input: string) => void;
  history: string[]; // past command lines, oldest first
  /** Current working directory for the prompt, e.g. `~` or `~/projects`. */
  cwd: string;

  // Theme
  getThemeId: () => string;
  setTheme: (id: string) => boolean; // false if id is unknown

  // Help
  openHelpPanel: () => void;
  /** Metadata for every registered command (drives `help`). */
  commands: CommandMeta[];
}

export interface CommandModule {
  meta: CommandMeta;
  /** Render the output. Return null for commands with no visible output. */
  run: (ctx: CommandContext) => ReactNode;
}
