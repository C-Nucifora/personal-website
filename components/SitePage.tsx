import { Terminal } from "@/components/terminal/Terminal";
import { StaticContent } from "@/components/content/StaticContent";
import { profile } from "@/data/profile";
import { stripTodo } from "@/lib/strip-todo";
import type { WindowId } from "@/lib/terminal/types";

/**
 * Shared page body: the interactive terminal (shown once hydrated) over the
 * server-rendered fallback (SEO + no-JS baseline). Window routes pass their
 * window so the terminal deep-links into it (FLOW §4).
 */
export function SitePage({ initialWindow = null }: { initialWindow?: WindowId | null }) {
  return (
    <main className="min-h-dvh w-full">
      <div className="interactive">
        <Terminal initialWindow={initialWindow} />
      </div>

      <div className="static-fallback mx-auto w-full max-w-[880px] px-3 py-5 sm:px-4 sm:py-10">
        <StaticContent />

        <footer className="mt-6 text-center font-mono text-xs text-muted">
          {profile.name} · {stripTodo(profile.role)} · built as a terminal
        </footer>
      </div>
    </main>
  );
}
