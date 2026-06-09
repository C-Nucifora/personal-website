import { experience } from "@/data/resume";

const strip = (s: string) => s.replace(/^TODO\s*/, "");

/** Just the work history (roles), without education/skills. */
export function Experience() {
  if (experience.length === 0) {
    return <p className="text-muted">No roles listed yet.</p>;
  }

  return (
    <section aria-label="Experience">
      <ul className="space-y-5">
        {experience.map((e, i) => (
          <li key={i} className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="font-medium text-fg">
                {strip(e.title)}
                <span className="text-muted"> · {strip(e.org)}</span>
              </p>
              <p className="font-mono text-xs text-muted">
                {e.start}–{e.end}
                {e.location && !e.location.startsWith("TODO") ? ` · ${strip(e.location)}` : ""}
              </p>
            </div>
            {e.bullets.length > 0 && (
              <ul className="ml-4 list-disc space-y-1 font-sans text-[15px] leading-relaxed text-fg marker:text-subtle">
                {e.bullets.map((b, j) => (
                  <li key={j}>{strip(b)}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
