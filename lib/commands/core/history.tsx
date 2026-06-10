import type { CommandModule } from "../registry";
import { CmdLink } from "@/components/terminal/output/CmdLink";
import { Hint } from "@/components/content/messages";

export const history: CommandModule = {
  meta: {
    name: "history",
    aliases: [],
    description: "Numbered command history — !{n} re-runs an entry.",
    usage: "history",
  },
  run: (ctx) => (
    <div className="space-y-1 font-mono text-sm">
      {ctx.history.map((line, i) => (
        <p key={i}>
          <span className="inline-block w-8 text-right text-muted">{i + 1}</span>{" "}
          <CmdLink cmd={line} />
        </p>
      ))}
      <Hint>tip: !{ctx.history.length} re-runs the last entry</Hint>
    </div>
  ),
};
