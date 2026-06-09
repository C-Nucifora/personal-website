import type { CommandModule } from "./types";
import { Socials } from "@/components/content/Socials";

export const socials: CommandModule = {
  meta: {
    name: "socials",
    aliases: ["links"],
    description: "All my profiles in one place.",
    usage: "socials",
    group: "Reach me",
  },
  run: () => <Socials />,
};
