import { now } from "@/data/now";

const strip = (s: string) => s.replace(/^TODO\s*/, "");

/** What I'm focused on right now. */
export function Now() {
  return (
    <section aria-label="Now" className="space-y-3">
      <ul className="ml-4 list-disc space-y-1.5 font-sans text-[15px] leading-relaxed text-fg marker:text-accent">
        {now.items.map((item, i) => (
          <li key={i}>{strip(item)}</li>
        ))}
      </ul>
      <p className="font-mono text-xs text-muted">Last updated {now.updated}</p>
    </section>
  );
}
