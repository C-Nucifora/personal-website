import { experience, education, skills, type ResumeEntry } from "@/data/resume";
import { profile } from "@/data/profile";
import { hasResumePdf } from "@/data/generated/assets";
import { Icon } from "@/components/ui/Icon";
import { PrintButton } from "@/components/ui/PrintButton";

const strip = (s: string) => s.replace(/^TODO\s*/, "");

function EntryList({ heading, entries }: { heading: string; entries: ResumeEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">{heading}</h3>
      <ul className="space-y-5">
        {entries.map((e, i) => (
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
    </div>
  );
}

export function Resume() {
  return (
    <section aria-label="Resume" className="space-y-7">
      <EntryList heading="Experience" entries={experience} />
      <EntryList heading="Education" entries={education} />

      {skills.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">Skills</h3>
          <dl className="space-y-2">
            {skills.map((s) => (
              <div key={s.group} className="flex flex-wrap gap-x-2 gap-y-1">
                <dt className="font-mono text-sm text-muted">{s.group}:</dt>
                <dd className="font-mono text-sm text-fg">{s.items.map(strip).join(", ")}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="flex flex-wrap gap-2 print:hidden">
        {hasResumePdf && (
          <a
            href={profile.resumePdf}
            download
            className="inline-flex items-center gap-2 rounded-md border border-accent/40 px-3 py-2 text-sm text-accent transition-colors hover:bg-accent/10 hover:no-underline"
          >
            <Icon name="download" size={16} />
            Download PDF
          </a>
        )}
        <PrintButton />
      </div>
    </section>
  );
}
