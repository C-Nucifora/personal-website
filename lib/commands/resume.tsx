import type { CommandModule } from "./types";
import { Resume } from "@/components/content/Resume";
import { Line } from "@/components/content/messages";

export const resume: CommandModule = {
  meta: {
    name: "resume",
    aliases: ["cv"],
    description: "My experience, education, and skills — with a PDF to download.",
    usage: "resume [--download]",
    group: "My work",
  },
  run: (ctx) => {
    if (ctx.args.includes("--download")) {
      if (typeof window !== "undefined") {
        window.print();
      }
      return <Line>Opening the print dialog — choose “Save as PDF”…</Line>;
    }
    return <Resume />;
  },
};
