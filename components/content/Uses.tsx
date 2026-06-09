import { uses } from "@/data/uses";

const strip = (s: string) => s.replace(/^TODO\s*/, "");

/** The gear and software I use. */
export function Uses() {
  return (
    <section aria-label="Uses" className="space-y-2">
      <dl className="space-y-2">
        {uses.map((u) => (
          <div key={u.group} className="flex flex-wrap gap-x-2 gap-y-1">
            <dt className="font-mono text-sm text-muted">{u.group}:</dt>
            <dd className="font-mono text-sm text-fg">{u.items.map(strip).join(", ")}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
