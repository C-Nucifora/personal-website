import type { CommandModule } from "./types";
import { Fetch } from "@/components/content/Fetch";

/** neofetch-style identity card — who I am, at a glance. */
export const neofetch: CommandModule = {
  meta: {
    name: "neofetch",
    aliases: ["fetch"],
    description: "A system-info card — who I am, at a glance.",
    usage: "neofetch",
    group: "Get to know me",
  },
  run: (ctx) => <Fetch themeId={ctx.getThemeId()} />,
};
