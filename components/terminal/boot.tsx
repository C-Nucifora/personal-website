import type { ReactNode } from "react";
import { Fetch } from "@/components/content/Fetch";
import { readAndRecordLastLogin } from "./lastLogin";

export interface BootEntry {
  command: string | null;
  output: ReactNode;
}

const HINT_ITEMS = ["about", "projects", "resume", "help"];

/** The inline "try: a · b · c" hint; each word runs its command. */
export function BootHint({ onRun }: { onRun: (cmd: string) => void }) {
  return (
    <p className="font-mono text-sm text-muted">
      try:{" "}
      {HINT_ITEMS.map((c, i) => (
        <span key={c}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          <button
            type="button"
            onClick={() => onRun(c)}
            className="text-accent transition-colors hover:underline focus-visible:outline-2"
          >
            {c}
          </button>
        </span>
      ))}
    </p>
  );
}

/** The boot sequence seeded into the shell scrollback on page load. */
export function bootEntries(themeId: string, onRun: (cmd: string) => void): BootEntry[] {
  return [
    {
      command: null,
      output: <p className="font-mono text-sm text-muted">{readAndRecordLastLogin()}</p>,
    },
    { command: null, output: <Fetch themeId={themeId} /> },
    { command: null, output: <BootHint onRun={onRun} /> },
  ];
}
