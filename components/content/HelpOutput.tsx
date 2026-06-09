"use client";

import { GROUP_ORDER, type CommandMeta } from "@/lib/commands/types";
import { Chip } from "@/components/ui/Chip";

interface HelpOutputProps {
  commands: CommandMeta[];
  onRun: (name: string) => void;
  onOpenPanel: () => void;
}

/** The `help` output: a lead, then commands grouped by purpose with chips. */
export function HelpOutput({ commands, onRun, onOpenPanel }: HelpOutputProps) {
  const visible = commands.filter((c) => !c.hidden);

  return (
    <div className="space-y-5">
      <p className="text-fg">
        You don&apos;t need to know terminal commands — <span className="text-info">click anything</span>{" "}
        below, or type its name and press Enter.
      </p>

      {GROUP_ORDER.map((group) => {
        const inGroup = visible.filter((c) => c.group === group);
        if (inGroup.length === 0) return null;
        return (
          <div key={group} className="space-y-2">
            <h3 className="font-mono text-xs uppercase tracking-wider text-muted">{group}</h3>
            <ul className="space-y-1.5">
              {inGroup.map((c) => (
                <li key={c.name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Chip label={c.name} onClick={() => onRun(c.name)} />
                  <span className="font-sans text-sm text-fg">{c.description}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <p className="text-sm text-muted">
        Shortcuts: <span className="text-fg">Tab</span> completes,{" "}
        <span className="text-fg">↑/↓</span> walk history,{" "}
        <button
          type="button"
          onClick={onOpenPanel}
          className="text-accent underline-offset-2 hover:underline"
        >
          open the full guide
        </button>{" "}
        for everything.
      </p>
    </div>
  );
}
