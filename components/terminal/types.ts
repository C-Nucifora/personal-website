import type { ReactNode } from "react";

export interface LogEntry {
  id: number;
  /** The command line echoed above the output; null for system-only output. */
  command: string | null;
  /** The rendered output; null for commands like `clear` that show nothing. */
  output: ReactNode;
}
