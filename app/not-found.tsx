import Link from "next/link";
import { profile } from "@/data/profile";

export default function NotFound() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh w-full max-w-[880px] flex-col items-center justify-center px-4 py-10 outline-none"
    >
      <div className="w-full overflow-hidden rounded-xl border border-border bg-window shadow-[0_24px_60px_-12px_var(--shadow)]">
        <div className="flex items-center gap-2 border-b border-border bg-elevated px-3 py-2.5">
          <span className="h-3 w-3 rounded-full bg-ansi-red" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-ansi-yellow" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-ansi-green" aria-hidden="true" />
          <p className="flex-1 truncate text-center font-mono text-xs text-muted">
            visitor@{profile.username}: ~
          </p>
        </div>

        <div className="space-y-3 px-5 py-6 font-mono text-sm">
          <p className="flex flex-wrap items-baseline gap-2">
            <span aria-hidden="true">
              <span className="text-ansi-green">visitor</span>
              <span className="text-muted">@</span>
              <span className="text-ansi-magenta">{profile.username}</span>
              <span className="text-muted">:</span>
              <span className="text-ansi-blue">~</span>
              <span className="text-accent">$</span>
            </span>
            <span className="text-fg">cd this-page</span>
          </p>
          <p className="text-error">
            cd: this-page: No such file or directory <span className="text-muted">(404)</span>
          </p>
          <p className="font-sans text-[15px] leading-relaxed text-fg">
            That page doesn&apos;t exist. Let&apos;s get you back to the terminal.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-accent/40 px-3 py-2 text-sm text-accent transition-colors hover:bg-accent/10 hover:no-underline"
          >
            cd ~ &nbsp;→ &nbsp;back home
          </Link>
        </div>
      </div>
    </main>
  );
}
