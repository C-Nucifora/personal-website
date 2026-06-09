import type { CommandModule } from "./types";

export const exit: CommandModule = {
  meta: {
    name: "exit",
    aliases: ["quit", "logout", ":q"],
    description: "Leave the terminal. (There is no leaving.)",
    usage: "exit",
    group: "System",
    hidden: true,
  },
  run: () => (
    <p className="font-mono text-fg">
      There&apos;s no escape — but <span className="text-accent">clear</span> wipes the screen, and
      closing the tab works too. 👋
    </p>
  ),
};
