/**
 * Social / contact links. Rendered as clickable rows by `socials` and
 * `contact`. Keep every `url` absolute. `icon` maps to an inline SVG id in
 * components/ui/Icon.tsx — supported ids: github, linkedin, x, email, globe.
 */
export interface Social {
  label: string; // "GitHub"
  handle: string; // "@you"
  url: string;
  icon: "github" | "linkedin" | "x" | "email" | "globe";
}

export const socials: Social[] = [
  {
    label: "GitHub",
    handle: "@C-Nucifora",
    url: "https://github.com/C-Nucifora",
    icon: "github",
  },
  {
    label: "Email",
    handle: "cgnucifora@proton.me",
    url: "mailto:cgnucifora@proton.me",
    icon: "email",
  },
];
