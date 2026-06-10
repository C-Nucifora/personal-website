import type { CommandModule } from "../registry";
import { ErrorLine, Hint } from "@/components/content/messages";
import { renderFile } from "@/components/terminal/output/renderers";

/**
 * `vim <file>` — for now renders the file inline like `cat`; the read-only
 * full-pane viewer (FLOW §8.1) replaces this run() in the next phase.
 */
export const vim: CommandModule = {
  meta: {
    name: "vim",
    aliases: ["view", "vi"],
    description: "Open a file read-only.",
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
    return renderFile(node);
  },
};
