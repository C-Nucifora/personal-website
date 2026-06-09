"use client";

/**
 * Touch-only quick-action bar. The tmux prefix keys are keyboard-only, so on
 * coarse-pointer devices this surfaces the high-value actions as taps. Hidden
 * on fine pointers via the `.mobile-bar` rule in globals.css. Window/section
 * navigation already lives in the touch-friendly status-bar tabs.
 */
export function MobileBar({
  onRun,
  onClear,
  onPalette,
  onCycleTheme,
}: {
  onRun: (command: string) => void;
  onClear: () => void;
  onPalette: () => void;
  onCycleTheme: () => void;
}) {
  const btn =
    "min-h-[40px] flex-1 rounded-md border border-border bg-elevated px-2 font-mono text-xs text-fg transition-colors active:border-accent/60 active:text-accent focus-visible:outline-2";

  return (
    <nav aria-label="Quick actions" className="mobile-bar items-center gap-2 border-t border-border bg-window px-2 py-1.5">
      <button type="button" onClick={() => onRun("help")} className={btn}>
        help
      </button>
      <button type="button" onClick={onPalette} className={btn} aria-label="Search commands">
        search
      </button>
      <button type="button" onClick={onClear} className={btn}>
        clear
      </button>
      <button type="button" onClick={onCycleTheme} className={btn}>
        theme
      </button>
    </nav>
  );
}
