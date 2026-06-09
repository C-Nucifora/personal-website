import type { CommandModule } from "./types";

export const echo: CommandModule = {
  meta: {
    name: "echo",
    aliases: [],
    description: "Print back whatever you type after it.",
    usage: "echo [text]",
    group: "System",
  },
  run: (ctx) => {
    // Everything after the command word, verbatim.
    const text = ctx.raw.replace(/^echo\s?/i, "");
    return <p className="whitespace-pre-wrap font-mono text-fg">{text}</p>;
  },
};
