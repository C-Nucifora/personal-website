import type { CommandModule } from "./types";
import { Socials } from "@/components/content/Socials";
import { profile } from "@/data/profile";

export const contact: CommandModule = {
  meta: {
    name: "contact",
    aliases: ["email", "hire"],
    description: "How to reach me — email and social links.",
    usage: "contact",
    group: "Reach me",
  },
  run: () => (
    <div className="space-y-3">
      <p className="font-sans text-[15px] leading-relaxed text-fg">
        The fastest way to reach me is email — I read everything. Or find me on the links below.
      </p>
      <p className="font-mono text-sm">
        <span className="text-muted">$ </span>
        <a href={`mailto:${profile.email}`}>{profile.email}</a>
      </p>
      <Socials />
    </div>
  ),
};
