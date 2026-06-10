/**
 * The site's sections — the single source of truth for the nav row and for
 * deep links. There are no "windows": selecting a section just runs its command
 * into the one continuous log.
 */
export interface Section {
  /** URL-hash label and button text, e.g. `about`. */
  label: string;
  /** Command run when the section is selected or deep-linked. */
  command: string;
  /** Shown as a button in the nav row. */
  nav?: boolean;
}

export const SECTIONS: readonly Section[] = [
  { label: "about", command: "about", nav: true },
  { label: "projects", command: "projects", nav: true },
  { label: "resume", command: "resume", nav: true },
  { label: "contact", command: "contact", nav: true },
  { label: "homelab", command: "homelab" },
];

/** The primary nav-row sections. */
export const NAV_SECTIONS: readonly Section[] = SECTIONS.filter((s) => s.nav);

/** Map a URL hash (e.g. `#projects`) to the command to run on load, or undefined. */
export function commandForHash(hash: string): string | undefined {
  const label = hash.replace(/^#/, "").toLowerCase();
  if (!label) return undefined;
  return SECTIONS.find((s) => s.label === label)?.command;
}
