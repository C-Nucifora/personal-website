import type { CommandModule } from "../registry";
import { ErrorLine } from "@/components/content/messages";
import { Listing } from "@/components/terminal/output/Listing";

export const ls: CommandModule = {
  meta: {
    name: "ls",
    aliases: ["ll", "dir"],
    description: "List the current directory — everything listed is clickable.",
    usage: "ls [-a] [path]",
  },
  run: (ctx) => {
    const showHidden = ctx.args.some((a) => /^-\w*a/.test(a));
    const pathArg = ctx.args.find((a) => !a.startsWith("-")) ?? "";
    const path = ctx.resolve(pathArg);
    const target = ctx.node(path);

    if (!target) {
      return <ErrorLine>ls: no such file or directory: {pathArg || path}</ErrorLine>;
    }
    if (target.kind === "file") {
      return <Listing entries={[target]} />;
    }
    return <Listing entries={target.children.filter((n) => showHidden || !n.hidden)} />;
  },
};
