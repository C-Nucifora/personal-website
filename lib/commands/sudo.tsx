import type { CommandModule } from "./types";

export const sudo: CommandModule = {
  meta: {
    name: "sudo",
    aliases: ["su", "doas"],
    description: "Elevate privileges. (You already have them.)",
    usage: "sudo <command>",
    group: "System",
    hidden: true,
  },
  run: (ctx) => {
    const rest = ctx.args.join(" ").toLowerCase();
    if (rest === "make me a sandwich") {
      return <p className="font-mono text-fg">Okay. 🥪</p>;
    }
    return (
      <p className="font-mono text-fg">
        <span className="text-muted">Permission granted</span> — you&apos;ve had root this whole
        time. Make yourself at home.
      </p>
    );
  },
};
