import type { CommandModule } from "./types";
import { Uses } from "@/components/content/Uses";

export const uses: CommandModule = {
  meta: {
    name: "uses",
    aliases: ["stack", "setup"],
    description: "The gear, editor, and tools I use.",
    usage: "uses",
    group: "Get to know me",
  },
  run: () => <Uses />,
};
