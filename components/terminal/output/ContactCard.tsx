import { profile } from "@/data/profile";
import { Socials } from "@/components/content/Socials";

/**
 * Rich renderer for ~/contact/contact.md — email first, then the social
 * rows, then the homelab link (relocated here from the old commands).
 */
export function ContactCard() {
  return (
    <section aria-label="Contact" className="space-y-3">
      <p className="text-fg">
        The fastest way is email:{" "}
        <a href={`mailto:${profile.email}`} className="text-accent">
          {profile.email}
        </a>
      </p>
      <Socials />
      <p className="text-sm text-muted">
        Homelab dashboard:{" "}
        <a href={profile.homelabUrl} target="_blank" rel="noopener noreferrer">
          {profile.homelabUrl.replace(/^https?:\/\//, "")}
        </a>
      </p>
    </section>
  );
}
