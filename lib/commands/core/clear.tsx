import type { CommandModule } from "../registry";

export const clear: CommandModule = {
  meta: {
    name: "clear",
    aliases: ["cls"],
    description: "Clear the screen (Ctrl+L works too).",
    usage: "clear",
  },
  run: (ctx) => {
    ctx.clear();
    return null;
  },
};
