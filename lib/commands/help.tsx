import type { CommandModule } from "./types";
import { HelpOutput } from "@/components/content/HelpOutput";

export const help: CommandModule = {
  meta: {
    name: "help",
    aliases: ["commands", "?"],
    description: "Start here — what you can do and how to do it.",
    usage: "help [--full]",
    group: "Get to know me",
  },
  run: (ctx) => {
    if (ctx.args.includes("--full")) {
      ctx.openHelpPanel();
    }
    return <HelpOutput commands={ctx.commands} onRun={ctx.run} onOpenPanel={ctx.openHelpPanel} />;
  },
};
