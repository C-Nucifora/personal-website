import type { CommandModule } from "./types";
import { Projects } from "@/components/content/Projects";

export const projects: CommandModule = {
  meta: {
    name: "projects",
    aliases: ["work"],
    description: "See the things I've built, with live and source links.",
    usage: "projects [--featured]",
    group: "My work",
  },
  run: (ctx) => {
    const featuredOnly = ctx.args.includes("--featured");
    return <Projects featuredOnly={featuredOnly} />;
  },
};
