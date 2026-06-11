import type { CommandModule } from "../registry";
import { profile } from "@/data/profile";
import { stripTodo } from "@/lib/strip-todo";
import { CmdLink } from "@/components/terminal/output/CmdLink";

export const whoami: CommandModule = {
  meta: {
    name: "whoami",
    aliases: [],
    description: "One line about me.",
    usage: "whoami",
  },
  run: () => (
    <p className="text-fg">
      {profile.name} — {stripTodo(profile.role)}. More:{" "}
      <CmdLink cmd="cd ~/about" />
    </p>
  ),
};
