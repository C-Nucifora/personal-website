import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { profile } from "@/data/profile";

/** Faux window title bar: decorative dots, the prompt label, theme switcher. */
export function TitleBar({ onHelp }: { onHelp?: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-elevated px-3 py-1.5">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-ansi-red" />
        <span className="h-2.5 w-2.5 rounded-full bg-ansi-yellow" />
        <span className="h-2.5 w-2.5 rounded-full bg-ansi-green" />
      </div>

      <p className="flex-1 truncate text-center font-mono text-xs text-muted">
        visitor@{profile.username}: ~
      </p>

      <div className="flex items-center gap-2">
        {onHelp && (
          <button
            type="button"
            onClick={onHelp}
            aria-label="Open the help guide"
            title="Help"
            className="rounded border border-border bg-elevated px-2 py-1 font-mono text-xs text-muted transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-2"
          >
            ?
          </button>
        )}
        <ThemeSwitcher />
      </div>
    </div>
  );
}
