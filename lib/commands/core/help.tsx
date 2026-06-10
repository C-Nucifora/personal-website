import type { CommandModule } from "../registry";
import { HelpSheet } from "@/components/terminal/output/HelpSheet";

export const help: CommandModule = {
  meta: {
    name: "help",
    aliases: ["?"],
    description: "This cheatsheet.",
    usage: "help",
  },
  run: (ctx) => <HelpSheet commands={ctx.commands} />,
};
