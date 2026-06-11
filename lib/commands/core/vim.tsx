import type { CommandModule } from "../registry";
import { ErrorLine, Hint } from "@/components/content/messages";

/** `vim <file>` — the read-only full-pane viewer (FLOW §8.1). */
export const vim: CommandModule = {
  meta: {
    name: "vim",
    aliases: ["view", "vi"],
    description: "Open a file in a read-only vim.",
    usage: "vim <file>",
  },
  run: (ctx) => {
    const arg = ctx.args[0];
    if (!arg) {
      return <Hint>vim: which file? Run `ls` to see what&apos;s here.</Hint>;
    }
    const path = ctx.resolve(arg);
    const node = ctx.node(path);
    if (!node) {
      return <ErrorLine>vim: no such file or directory: {arg}</ErrorLine>;
    }
    if (node.kind === "dir") {
      return <ErrorLine>vim: {arg}: Is a directory</ErrorLine>;
    }
    // `vi <file>` opens normally — with a statusline acknowledgment (§2).
    const viaVi = /^vi(\s|$)/.test(ctx.raw);
    ctx.openEditor(path, viaVi ? "vi improved. you're welcome." : undefined);
    return null;
  },
};
