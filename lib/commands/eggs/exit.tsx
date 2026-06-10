import type { CommandModule } from "../registry";

export const exit: CommandModule = {
  meta: {
    name: "exit",
    aliases: ["logout", "quit"],
    description: "Leave. (You can't.)",
    usage: "exit",
    hidden: true,
  },
  run: () => (
    <p className="text-fg">
      there is no escape. (close the tab if you must — we both know you won&apos;t)
    </p>
  ),
};
