import type { CommandModule } from "../registry";
import { ErrorLine, Hint } from "@/components/content/messages";
import { renderFile } from "@/components/terminal/output/renderers";

export const cat: CommandModule = {
  meta: {
    name: "cat",
    aliases: [],
    description: "Print a file — markdown renders, code gets highlighted.",
    usage: "cat <file>",
  },
  run: (ctx) => {
    const arg = ctx.args[0];
    if (!arg) {
      return <Hint>cat: which file? Run `ls` to see what&apos;s here.</Hint>;
    }
    const path = ctx.resolve(arg);
    const node = ctx.node(path);
    if (!node) {
      return <ErrorLine>cat: no such file or directory: {arg}</ErrorLine>;
    }
    if (node.kind === "dir") {
      return <ErrorLine>cat: {arg}: Is a directory</ErrorLine>;
    }
    return renderFile(node);
  },
};
