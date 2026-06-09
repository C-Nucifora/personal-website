import type { CommandModule } from "./types";
import { Hint } from "@/components/content/messages";

export const history: CommandModule = {
  meta: {
    name: "history",
    aliases: [],
    description: "Show the commands you've run (click one to run it again).",
    usage: "history",
    group: "System",
  },
  run: (ctx) => {
    if (ctx.history.length === 0) {
      return <Hint>No commands yet. Try `about` or `help`.</Hint>;
    }
    return (
      <ol className="space-y-0.5 font-mono text-sm">
        {ctx.history.map((cmd, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-6 shrink-0 text-right text-muted">{i + 1}</span>
            <button
              type="button"
              onClick={() => ctx.run(cmd)}
              className="text-fg hover:text-accent hover:underline"
            >
              {cmd}
            </button>
          </li>
        ))}
      </ol>
    );
  },
};
