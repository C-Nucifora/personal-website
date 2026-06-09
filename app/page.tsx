import { Terminal } from "@/components/terminal/Terminal";
import { StaticContent } from "@/components/content/StaticContent";
import { profile } from "@/data/profile";

const strip = (s: string) => s.replace(/^TODO\s*/, "");

export default function Home() {
  return (
    <main className="min-h-dvh w-full">
      {/* Interactive terminal — fills the viewport, shown only after it mounts. */}
      <div className="interactive">
        <Terminal />
      </div>

      {/* Server-rendered, no-JS baseline (SEO + hydration-failure fallback). */}
      <div className="static-fallback mx-auto w-full max-w-[880px] px-3 py-5 sm:px-4 sm:py-10">
        <StaticContent />

        <footer className="mt-6 text-center font-mono text-xs text-muted">
          {profile.name} · {strip(profile.role)} · built as a terminal
        </footer>
      </div>
    </main>
  );
}
