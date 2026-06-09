import { profile } from "@/data/profile";

const strip = (s: string) => s.replace(/^TODO\s*/, "");

/** Short bio. Prose uses the body face for readability inside the frame. */
export function About() {
  return (
    <section aria-label="About" className="space-y-3">
      <p className="text-sm text-muted">
        {strip(profile.role)}
        {profile.location && !profile.location.startsWith("TODO") ? ` · ${profile.location}` : ""}
      </p>
      <div className="space-y-3 font-sans text-[15px] leading-relaxed text-fg">
        {profile.about.map((para, i) => (
          <p key={i}>{strip(para)}</p>
        ))}
      </div>
    </section>
  );
}
