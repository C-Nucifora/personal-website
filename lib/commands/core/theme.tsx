import type { CommandModule } from "../registry";
import { ThemesOutput } from "@/components/content/ThemesOutput";
import { OkLine, ErrorLine } from "@/components/content/messages";
import { getThemeEntry, visibleThemes } from "@/lib/themes";
import { store } from "@/lib/terminal/store";

export const theme: CommandModule = {
  meta: {
    name: "theme",
    aliases: ["themes", "color", "colour"],
    description: "Switch the color theme; no name lists them.",
    usage: "theme [name|random]",
  },
  run: (ctx) => {
    const name = ctx.args[0];
    // Locked themes (CRT pre-Konami) don't exist as far as `theme` knows.
    const available = visibleThemes(store.getState().crtUnlocked);

    if (!name) {
      // The picker chips run `theme <id>` through the click pipeline so the
      // GUI control stays inside the one-state rule (FLOW §10.1).
      return (
        <ThemesOutput
          currentId={ctx.getThemeId()}
          onSet={(id) => ctx.runClick(`theme ${id}`)}
        />
      );
    }

    if (name === "random") {
      const others = available.filter((t) => t.id !== ctx.getThemeId());
      const pick = others[Math.floor(Math.random() * others.length)] ?? available[0];
      ctx.setTheme(pick.id);
      return <OkLine>Theme set to {pick.label} (random).</OkLine>;
    }

    if (available.some((t) => t.id === name) && ctx.setTheme(name)) {
      return <OkLine>Theme set to {getThemeEntry(name).label}.</OkLine>;
    }
    return (
      <ErrorLine>
        no theme called &ldquo;{name}&rdquo; — available:{" "}
        {available.map((t) => t.id).join(", ")}
      </ErrorLine>
    );
  },
};
