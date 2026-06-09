"use client";

import { PromptLabel } from "./PromptLabel";
import type { LogEntry } from "./types";

/**
 * The scrolling output region. role="log" + aria-live="polite" means a screen
 * reader announces new output as commands run. Real DOM, not a terminal image.
 */
export function OutputLog({ entries }: { entries: LogEntry[] }) {
  return (
    <div role="log" aria-live="polite" aria-label="Command output" className="space-y-4">
      {entries.map((entry) => (
        <div key={entry.id} className="output-fade space-y-2">
          {entry.command !== null && (
            <p className="flex flex-wrap items-baseline gap-2">
              <PromptLabel />
              <span className="font-mono text-sm text-fg">{entry.command}</span>
            </p>
          )}
          {entry.output !== null && entry.output !== undefined && (
            <div className="pl-0 text-sm leading-relaxed">{entry.output}</div>
          )}
        </div>
      ))}
    </div>
  );
}
