import type { CommandModule } from "../registry";
import { ErrorLine } from "@/components/content/messages";
import { TreeView } from "@/components/terminal/output/TreeView";

export const tree: CommandModule = {
  meta: {
    name: "tree",
    aliases: [],
    description: "Show a clickable directory tree, three levels deep.",
    usage: "tree [path]",
  },
  run: (ctx) => {
    const arg = ctx.args[0] ?? "";
    const path = ctx.resolve(arg);
    const node = ctx.node(path);
    if (!node) {
      return <ErrorLine>tree: no such file or directory: {arg || path}</ErrorLine>;
    }
    if (node.kind === "file") {
      return <ErrorLine>tree: {arg}: not a directory</ErrorLine>;
    }
    return <TreeView root={node} label={path} />;
  },
};
