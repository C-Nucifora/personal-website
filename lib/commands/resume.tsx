import type { CommandModule } from "./types";
import { Resume } from "@/components/content/Resume";
import { Line } from "@/components/content/messages";
import { profile } from "@/data/profile";

export const resume: CommandModule = {
  meta: {
    name: "resume",
    aliases: ["cv", "experience"],
    description: "My experience, education, and skills — with a PDF to download.",
    usage: "resume [--download]",
    group: "My work",
  },
  run: (ctx) => {
    if (ctx.args.includes("--download")) {
      if (typeof window !== "undefined") {
        window.open(profile.resumePdf, "_blank", "noopener,noreferrer");
      }
      return <Line>Opening the resume PDF in a new tab…</Line>;
    }
    return <Resume />;
  },
};
