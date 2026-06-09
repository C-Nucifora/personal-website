import type { CommandModule } from "./types";
import { ThemesOutput } from "@/components/content/ThemesOutput";
import { OkLine, ErrorLine } from "@/components/content/messages";
import { themes, getThemeEntry } from "@/lib/themes";

export const theme: CommandModule = {
  meta: {
    name: "theme",
    aliases: ["color", "colour"],
    description: "Switch the colour theme. Try `theme tokyo-night-day`.",
    usage: "theme [name]",
    group: "Customize",
  },
  run: (ctx) => {
    const name = ctx.args[0];

    // No name → show the picker.
    if (!name) {
      return <ThemesOutput currentId={ctx.getThemeId()} onSet={ctx.setTheme} />;
    }

    const ok = ctx.setTheme(name);
    if (ok) {
      return <OkLine>Theme set to {getThemeEntry(name).label}.</OkLine>;
    }
    return (
      <ErrorLine>
        I don&apos;t have a theme called &ldquo;{name}&rdquo;. Available: {themes.map((t) => t.id).join(", ")}.
      </ErrorLine>
    );
  },
};
