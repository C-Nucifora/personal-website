import type { CommandModule } from "./types";
import { About } from "@/components/content/About";

export const about: CommandModule = {
  meta: {
    name: "about",
    aliases: ["bio", "whois"],
    description: "A short intro — who I am and what I build.",
    usage: "about",
    group: "Get to know me",
  },
  run: () => <About />,
};
