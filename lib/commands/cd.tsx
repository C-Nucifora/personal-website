import type { CommandModule } from "./types";
import { ErrorLine } from "@/components/content/messages";

/** Section "directories" you can cd into. */
const DIRS = ["about", "resume", "projects", "contact", "homelab", "socials"];

/** Change directory: navigate to a section, or `cd ~`/`cd ..` for home. */
export const cd: CommandModule = {
  meta: {
    name: "cd",
    aliases: [],
    description: "Change directory — cd into a section, or `cd ~` for home.",
    usage: "cd [section]",
    group: "System",
  },
  run: (ctx) => {
    const target = ctx.args[0];

    // Home: cd, cd ~, cd .., cd / all return to the shell (its scrollback is
    // preserved — only `clear` empties it).
    if (!target || target === "~" || target === ".." || target === "/") {
      return null;
    }

    const dir = target.replace(/\/+$/, "").toLowerCase();
    if (DIRS.includes(dir)) {
      ctx.run(dir);
      return null;
    }

    return (
      <ErrorLine>
        cd: {target}: no such directory. Try: {DIRS.join(", ")}.
      </ErrorLine>
    );
  },
};
