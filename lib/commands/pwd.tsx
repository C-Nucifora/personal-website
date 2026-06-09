import type { CommandModule } from "./types";
import { Line } from "@/components/content/messages";

/** Print the working directory (the section you're currently in). */
export const pwd: CommandModule = {
  meta: {
    name: "pwd",
    aliases: [],
    description: "Print the current directory.",
    usage: "pwd",
    group: "System",
  },
  run: (ctx) => <Line>{ctx.cwd.replace(/^~/, "/home/visitor")}</Line>,
};
