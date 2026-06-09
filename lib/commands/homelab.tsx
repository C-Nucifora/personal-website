import type { CommandModule } from "./types";
import { Line, Hint, ErrorLine } from "@/components/content/messages";
import { profile } from "@/data/profile";

const isConfigured = (url: string) => !!url && !url.includes("TODO") && !url.includes(".example");

export const homelab: CommandModule = {
  meta: {
    name: "homelab",
    aliases: ["lab", "dashboard"],
    description: "Open my homelab dashboard in a new tab.",
    usage: "homelab",
    group: "Elsewhere",
  },
  run: () => {
    const url = profile.homelabUrl;

    if (!isConfigured(url)) {
      return (
        <ErrorLine>
          The homelab dashboard isn&apos;t configured yet. Set{" "}
          <span className="font-mono text-fg">profile.homelabUrl</span> in{" "}
          <span className="font-mono text-fg">data/profile.ts</span>.
        </ErrorLine>
      );
    }

    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }

    return (
      <div className="space-y-1">
        <Line>
          Opening the homelab dashboard in a new tab →{" "}
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        </Line>
        <Hint>If your browser blocked the new tab, use the link above.</Hint>
      </div>
    );
  },
};
