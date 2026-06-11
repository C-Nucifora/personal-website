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
        // The showpiece (§4.2): a pure overlay — the state is never touched.
        const reduced =
          window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
        const mobile = !(window.matchMedia?.("(min-width: 768px)").matches ?? true);
        if (reduced || mobile) {
          return <p className="text-fg">Nice try. Filesystem restored from backup.</p>;
        }
        ctx.startOverlay("disintegration");
        return null;
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
