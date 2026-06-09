import type { CommandModule } from "./types";
import { Chip } from "@/components/ui/Chip";
import { ErrorLine } from "@/components/content/messages";

/** Pseudo-files: each maps to a content command. */
const SECTIONS = ["about", "resume", "projects", "contact", "socials"];

export const ls: CommandModule = {
  meta: {
    name: "ls",
    aliases: ["dir"],
    description: "List the sections of this site (then open one).",
    usage: "ls [section]",
    group: "System",
  },
  run: (ctx) => {
    const target = ctx.args[0];

    if (target) {
      if (SECTIONS.includes(target)) {
        ctx.run(target);
        return null;
      }
      return (
        <ErrorLine>
          ls: {target}: no such section. Try: {SECTIONS.join(", ")}.
        </ErrorLine>
      );
    }

    return (
      <div className="space-y-2">
        <p className="text-muted">Sections — click one to open it:</p>
        <ul className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <li key={s}>
              <Chip label={s} onClick={() => ctx.run(s)} />
            </li>
          ))}
        </ul>
      </div>
    );
  },
};
