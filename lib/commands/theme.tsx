import type { CommandModule } from "./types";
import { ThemesOutput } from "@/components/content/ThemesOutput";
import { OkLine, ErrorLine } from "@/components/content/messages";
import { themes, getThemeEntry } from "@/lib/themes";

export const theme: CommandModule = {
  meta: {
    name: "theme",
    aliases: ["color", "colour"],
    description: "Switch the colour theme. Try `theme tokyo-night-day` or `theme random`.",
    usage: "theme [name|random]",
    group: "Customize",
  },
  run: (ctx) => {
    const name = ctx.args[0];

    // No name → show the picker.
    if (!name) {
      return <ThemesOutput currentId={ctx.getThemeId()} onSet={ctx.setTheme} />;
    }

    // `theme random` → pick a different theme at random.
    if (name === "random") {
      const others = themes.filter((t) => t.id !== ctx.getThemeId());
      const pick = others[Math.floor(Math.random() * others.length)] ?? themes[0];
      ctx.setTheme(pick.id);
      return <OkLine>Theme set to {pick.label} (random).</OkLine>;
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
