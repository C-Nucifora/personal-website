import type { ReactNode } from "react";
import type { CommandModule } from "./types";
import { ErrorLine, Hint } from "@/components/content/messages";

/** A man page for any command, built from its registered metadata. */
export const man: CommandModule = {
  meta: {
    name: "man",
    aliases: ["manual"],
    description: "Show the manual page for a command.",
    usage: "man <command>",
    group: "System",
  },
  run: (ctx) => {
    const name = ctx.args[0];
    if (!name) {
      return <Hint>What manual page do you want? Try `man ls` or `man theme`.</Hint>;
    }

    const q = name.toLowerCase();
    const meta = ctx.commands.find(
      (c) => c.name === q || c.aliases.some((a) => a.toLowerCase() === q),
    );
    if (!meta) {
      return <ErrorLine>No manual entry for {name}. Try `help` for the command list.</ErrorLine>;
    }

    const Row = ({ label, children }: { label: string; children: ReactNode }) => (
      <div className="grid grid-cols-[6rem_1fr] gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-muted">{label}</span>
        <span className="text-fg">{children}</span>
      </div>
    );

    return (
      <div className="space-y-2 font-mono text-sm">
        <Row label="Name">
          {meta.name} — {meta.description}
        </Row>
        <Row label="Synopsis">
          <span className="text-accent">{meta.usage}</span>
        </Row>
        {meta.aliases.length > 0 && <Row label="Aliases">{meta.aliases.join(", ")}</Row>}
        <Row label="Section">{meta.group}</Row>
      </div>
    );
  },
};
