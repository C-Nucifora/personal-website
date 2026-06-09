import type { CommandModule } from "./types";
import { profile } from "@/data/profile";

const strip = (s: string) => s.replace(/^TODO\s*/, "");

export const whoami: CommandModule = {
  meta: {
    name: "whoami",
    aliases: [],
    description: "A one-line reminder of whose site this is.",
    usage: "whoami",
    group: "System",
  },
  run: () => (
    <p className="font-mono text-fg">
      visitor <span className="text-muted">— you&apos;re browsing</span>{" "}
      <span className="text-accent">{profile.name}</span>
      <span className="text-muted">&apos;s portfolio ({strip(profile.role)}). Type </span>
      <span className="text-fg">about</span>
      <span className="text-muted"> to learn more.</span>
    </p>
  ),
};
