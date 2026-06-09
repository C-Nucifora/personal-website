import { socials } from "@/data/socials";
import { Icon } from "@/components/ui/Icon";

/** Contact / social links as clickable rows with icons. */
export function Socials() {
  if (socials.length === 0) {
    return <p className="text-muted">No links yet.</p>;
  }

  return (
    <section aria-label="Links">
      <ul className="space-y-1">
        {socials.map((s) => {
          const external = !s.url.startsWith("mailto:");
          return (
            <li key={s.label}>
              <a
                href={s.url}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-elevated hover:no-underline"
              >
                <Icon name={s.icon} size={18} className="text-muted group-hover:text-accent" />
                <span className="w-24 shrink-0 font-medium text-fg group-hover:text-accent">
                  {s.label}
                </span>
                <span className="truncate font-mono text-sm text-muted">{s.handle}</span>
                {external && (
                  <Icon
                    name="external"
                    size={13}
                    className="ml-auto text-subtle opacity-0 transition-opacity group-hover:opacity-100"
                  />
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
