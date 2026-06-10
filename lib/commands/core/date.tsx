import type { CommandModule } from "../registry";

export const date: CommandModule = {
  meta: {
    name: "date",
    aliases: [],
    description: "Print the date.",
    usage: "date",
  },
  // Runs client-side only (command execution), so no hydration concern.
  run: () => <p className="font-mono text-fg">{new Date().toString()}</p>,
};
