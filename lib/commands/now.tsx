import type { CommandModule } from "./types";
import { Now } from "@/components/content/Now";

export const now: CommandModule = {
  meta: {
    name: "now",
    aliases: ["current"],
    description: "What I'm focused on right now.",
    usage: "now",
    group: "Get to know me",
  },
  run: () => <Now />,
};
