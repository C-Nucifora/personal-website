import type { CommandModule } from "./types";
import { ThemesOutput } from "@/components/content/ThemesOutput";

export const themes: CommandModule = {
  meta: {
    name: "themes",
    aliases: ["palettes"],
    description: "List every theme and switch with a click.",
    usage: "themes",
    group: "Customize",
  },
  run: (ctx) => <ThemesOutput currentId={ctx.getThemeId()} onSet={ctx.setTheme} />,
};
