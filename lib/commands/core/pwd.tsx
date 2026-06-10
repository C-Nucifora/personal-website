import type { CommandModule } from "../registry";

export const pwd: CommandModule = {
  meta: {
    name: "pwd",
    aliases: [],
    description: "Print where you are.",
    usage: "pwd",
  },
  run: (ctx) => <p className="font-mono text-fg">{ctx.cwd}</p>,
};
