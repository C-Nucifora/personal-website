"use client";

/** Top nav. Each button runs the same command a visitor could type. */
const NAV_ITEMS = ["about", "resume", "projects", "contact", "help"] as const;

export function NavBar({ onRun }: { onRun: (command: string) => void }) {
  return (
    <nav
      aria-label="Sections"
      className="flex flex-wrap items-center gap-1 border-b border-border bg-window px-2 py-1.5"
    >
      {NAV_ITEMS.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onRun(item)}
          className="min-h-[36px] rounded px-3 py-1.5 font-mono text-sm text-muted transition-colors hover:bg-elevated hover:text-accent focus-visible:outline-2"
        >
          {item}
        </button>
      ))}
    </nav>
  );
}
