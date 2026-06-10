import type { CommandModule } from "./types";

export const clear: CommandModule = {
  meta: {
    name: "clear",
    aliases: ["cls"],
    description: "Clear the shell scrollback (the boot card returns on reload).",
    usage: "clear",
    group: "System",
  },
  run: (ctx) => {
    ctx.clear();
    return null;
  },
};
