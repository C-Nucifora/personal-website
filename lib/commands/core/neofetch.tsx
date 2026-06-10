import type { CommandModule } from "../registry";
import { Fetch } from "@/components/content/Fetch";

export const neofetch: CommandModule = {
  meta: {
    name: "neofetch",
    aliases: ["fetch", "fastfetch"],
    description: "Reprint the landing banner.",
    usage: "neofetch",
  },
  run: (ctx) => <Fetch themeId={ctx.getThemeId()} />,
};
