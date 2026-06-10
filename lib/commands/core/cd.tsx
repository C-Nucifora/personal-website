import type { CommandModule } from "../registry";
import { ErrorLine } from "@/components/content/messages";

export const cd: CommandModule = {
  meta: {
    name: "cd",
    aliases: [],
    description: "Change directory — moving into a section switches to its tab.",
    usage: "cd [path]",
  },
  run: (ctx) => {
    const arg = ctx.args[0] ?? "";
    const path = arg === "-" ? ctx.prevCwd : ctx.resolve(arg || "~");
    const target = ctx.node(path);
    if (!target) {
      return <ErrorLine>cd: no such file or directory: {arg || path}</ErrorLine>;
    }
    if (target.kind === "file") {
      return <ErrorLine>cd: not a directory: {arg || path}</ErrorLine>;
    }
    ctx.setCwd(path);
    return null;
  },
};
