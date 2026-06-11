import type { CommandModule } from "../registry";
import { ErrorLine } from "@/components/content/messages";

export const rm: CommandModule = {
  meta: {
    name: "rm",
    aliases: [],
    description: "Remove files. (No.)",
    usage: "rm <file>",
    hidden: true,
  },
  run: (ctx) => {
    const flags = ctx.args.filter((a) => a.startsWith("-"));
    const targets = ctx.args.filter((a) => !a.startsWith("-"));
    const recursive = flags.some((f) => /^-\w*r/i.test(f));

    if (targets.includes("/") && recursive) {
      if (ctx.args.includes("--no-preserve-root")) {
        // The §4.2 disintegration arrives with the showpieces; until then
        // the backup speaks for itself.
        return <p className="text-fg">Nice try. Filesystem restored from backup.</p>;
      }
      return (
        <div>
          <ErrorLine>{`rm: it is dangerous to operate recursively on '/'`}</ErrorLine>
          <ErrorLine>rm: use --no-preserve-root to override this failsafe</ErrorLine>
        </div>
      );
    }

    if (targets.length === 0) {
      return <ErrorLine>rm: missing operand</ErrorLine>;
    }

    const target = targets[0];
    const node = ctx.node(ctx.resolve(target));
    if (!node) {
      return <ErrorLine>{`rm: cannot remove '${target}': No such file or directory`}</ErrorLine>;
    }
    return <ErrorLine>{`rm: cannot remove '${target}': Protected by recruiters union`}</ErrorLine>;
  },
};
