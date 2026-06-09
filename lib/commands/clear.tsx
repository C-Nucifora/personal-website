import type { CommandModule } from "./types";

export const clear: CommandModule = {
  meta: {
    name: "clear",
    aliases: ["cls"],
    description: "Clear the screen (keeps the welcome hint).",
    usage: "clear",
    group: "System",
  },
  run: (ctx) => {
    ctx.clear();
    return null;
  },
};
