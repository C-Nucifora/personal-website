import type { CommandModule } from "../registry";

export const echo: CommandModule = {
  meta: {
    name: "echo",
    aliases: [],
    description: "Print text back.",
    usage: "echo <text>",
  },
  run: (ctx) => {
    const text = ctx.raw.replace(/^\S+\s*/, "");
    return <p className="font-mono text-fg">{text || " "}</p>;
  },
};
