import type { CommandModule } from "./types";
import { ErrorLine, Hint } from "@/components/content/messages";
import { resolveCommand } from "./index";

/** Readable "files" — each prints the content of a section inline. */
const FILES = ["about", "resume", "projects", "contact", "socials", "experience", "now", "uses"];

/** cat a section "file" — prints its content in place, without navigating. */
export const cat: CommandModule = {
  meta: {
    name: "cat",
    aliases: [],
    description: "Print the contents of a section file (e.g. `cat resume`).",
    usage: "cat <file>",
    group: "System",
  },
  run: (ctx) => {
    const arg = ctx.args[0];
    if (!arg) {
      return <Hint>What file? Try `cat about` or `cat resume`. Run `ls` to see them.</Hint>;
    }

    const file = arg.replace(/\.(md|txt)$/i, "").toLowerCase();
    if (!FILES.includes(file)) {
      return <ErrorLine>cat: {arg}: no such file. Try one of: {FILES.join(", ")}.</ErrorLine>;
    }

    const mod = resolveCommand(file);
    if (!mod) {
      return <ErrorLine>cat: {arg}: could not read file.</ErrorLine>;
    }
    return mod.run(ctx);
  },
};
