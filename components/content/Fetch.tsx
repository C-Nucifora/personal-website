import { profile } from "@/data/profile";
import { uses } from "@/data/uses";

const clean = (s: string) => s.replace(/^TODO\s*/, "").trim();
const real = (items: string[]) => items.map(clean).filter((s) => s && s !== "TODO");

const LOGO = String.raw`
   _____ _   _
  / ____| \ | |
 | |    |  \| |
 | |___ | |\  |
  \_____|_| \_|
`;

const ANSI = [
  "bg-ansi-red",
  "bg-ansi-yellow",
  "bg-ansi-green",
  "bg-ansi-cyan",
  "bg-ansi-blue",
  "bg-ansi-magenta",
] as const;

function uptime(): string {
  const secs = typeof performance !== "undefined" ? Math.round(performance.now() / 1000) : 0;
  if (secs < 60) return `${Math.max(1, secs)} sec`;
  return `${Math.round(secs / 60)} min`;
}

/** The neofetch-style identity card, built from the site data. Pure. */
export function Fetch({ themeId }: { themeId: string }) {
  const editor = real(uses.find((u) => u.group === "Editor & terminal")?.items ?? []).slice(0, 2);
  const stack = real(uses.find((u) => u.group === "Languages")?.items ?? []).slice(0, 3);

  const rows: [string, string][] = [
    ["Host", profile.name],
    ["Role", clean(profile.role)],
    ["Location", clean(profile.location)],
    ["Shell", "zsh"],
    ...(editor.length ? ([["Editor", editor.join(", ")]] as [string, string][]) : []),
    ["Theme", themeId],
    ...(stack.length ? ([["Stack", stack.join(", ")]] as [string, string][]) : []),
    ["Uptime", uptime()],
    ["Contact", profile.email],
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
      <pre className="font-mono text-xs leading-tight text-accent" aria-hidden="true">
        {LOGO}
      </pre>
      <div className="space-y-1.5 font-mono text-sm">
        <p>
          <span className="text-ansi-green">visitor</span>
          <span className="text-muted">@</span>
          <span className="text-ansi-magenta">{profile.username}</span>
        </p>
        <p className="text-muted">-----------------</p>
        {rows.map(([label, val]) => (
          <p key={label}>
            <span className="text-accent">{label}</span>
            <span className="text-muted">: </span>
            <span className="text-fg">
              {label === "Contact" ? <a href={`mailto:${val}`}>{val}</a> : val}
            </span>
          </p>
        ))}
        <div className="flex gap-1 pt-2" aria-hidden="true">
          {ANSI.map((c) => (
            <span key={c} className={`h-3.5 w-3.5 rounded-sm border border-border ${c}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
