import type { CommandModule } from "./types";
import { Experience } from "@/components/content/Experience";

export const experience: CommandModule = {
  meta: {
    name: "experience",
    aliases: ["jobs", "work-history"],
    description: "My work history — roles and what I shipped.",
    usage: "experience",
    group: "My work",
  },
  run: () => <Experience />,
};
