import { Terminal } from "@/components/terminal/Terminal";
import { StaticContent } from "@/components/content/StaticContent";
import { profile } from "@/data/profile";

const strip = (s: string) => s.replace(/^TODO\s*/, "");

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[880px] flex-col px-3 py-5 sm:px-4 sm:py-10">
      {/* Interactive terminal — shown only after it successfully mounts. */}
      <div className="interactive">
        <Terminal />
      </div>

      {/* Server-rendered, no-JS baseline (SEO + hydration-failure fallback). */}
      <StaticContent />

      <footer className="mt-6 text-center font-mono text-xs text-muted">
        {profile.name} · {strip(profile.role)} · built as a terminal
      </footer>
    </main>
  );
}
