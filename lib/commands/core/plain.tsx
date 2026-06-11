import type { CommandModule } from "../registry";
import { OkLine } from "@/components/content/messages";
import { setViewMode } from "@/lib/view-mode";

export const plain: CommandModule = {
  meta: {
    name: "plain",
    aliases: ["plain-view"],
    description: "Switch to the plain website view — no terminal required.",
    usage: "plain",
  },
  run: () => {
    setViewMode("plain");
    // Prints into the (now hidden) scrollback; greets them if they return.
    return <OkLine>Switched to plain view — the terminal keeps your place.</OkLine>;
  },
};
