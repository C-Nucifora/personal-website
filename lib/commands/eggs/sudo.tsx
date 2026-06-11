import type { CommandModule } from "../registry";
import { ContactCard } from "@/components/terminal/output/ContactCard";
import { ErrorLine, OkLine } from "@/components/content/messages";

export const sudo: CommandModule = {
  meta: {
    name: "sudo",
    aliases: [],
    description: "Try it.",
    usage: "sudo <command>",
    hidden: true,
  },
  run: (ctx) => {
    const rest = ctx.args.join(" ").toLowerCase();
    if (rest === "make me a sandwich") {
      return <p className="text-fg">Okay.</p>;
    }
    if (rest === "hire christian") {
      // The only sudo that works.
      return (
        <div className="space-y-3">
          <OkLine>permission granted.</OkLine>
          <ContactCard />
        </div>
      );
    }
    return (
      <ErrorLine>
        christian is not in the sudoers file. This incident will be reported.
      </ErrorLine>
    );
  },
};
