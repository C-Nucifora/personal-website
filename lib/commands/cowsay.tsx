import type { CommandModule } from "./types";

function cow(text: string): string {
  const msg = text || "moo";
  const top = " " + "_".repeat(msg.length + 2);
  const mid = `< ${msg} >`;
  const bot = " " + "-".repeat(msg.length + 2);
  return [
    top,
    mid,
    bot,
    "        \\   ^__^",
    "         \\  (oo)\\_______",
    "            (__)\\       )\\/\\",
    "                ||----w |",
    "                ||     ||",
  ].join("\n");
}

export const cowsay: CommandModule = {
  meta: {
    name: "cowsay",
    aliases: [],
    description: "Have a cow say something.",
    usage: "cowsay <text>",
    group: "System",
    hidden: true,
  },
  run: (ctx) => {
    // Keep it tidy; collapse to a single line and cap the length.
    const text = ctx.raw.replace(/^cowsay\s?/i, "").replace(/\s+/g, " ").slice(0, 60);
    return (
      <pre className="overflow-x-auto font-mono text-xs leading-tight text-fg">{cow(text)}</pre>
    );
  },
};
