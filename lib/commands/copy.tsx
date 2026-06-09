import type { CommandModule } from "./types";
import { OkLine, ErrorLine, Hint } from "@/components/content/messages";
import { profile } from "@/data/profile";

export const copy: CommandModule = {
  meta: {
    name: "copy",
    aliases: ["copy-email", "yank"],
    description: "Copy my email to your clipboard.",
    usage: "copy",
    group: "Reach me",
  },
  run: () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(profile.email).catch(() => {});
      return <OkLine>Copied {profile.email} to your clipboard.</OkLine>;
    }
    return (
      <div className="space-y-1">
        <ErrorLine>Couldn&apos;t reach the clipboard here.</ErrorLine>
        <Hint>
          Email me at <span className="font-mono text-fg">{profile.email}</span>.
        </Hint>
      </div>
    );
  },
};
