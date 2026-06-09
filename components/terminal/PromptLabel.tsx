import { profile } from "@/data/profile";

/** The `visitor@username:~$` prompt label. Shared by the log echo and input. */
export function PromptLabel() {
  return (
    <span className="select-none font-mono text-sm" aria-hidden="true">
      <span className="text-ansi-green">visitor</span>
      <span className="text-muted">@</span>
      <span className="text-ansi-magenta">{profile.username}</span>
      <span className="text-muted">:</span>
      <span className="text-ansi-blue">~</span>
      <span className="text-accent">$</span>
    </span>
  );
}
