/** Cheap one-line responses (EASTER_EGGS §1). One module each, all hidden. */
import type { CommandModule } from "../registry";
import { ErrorLine } from "@/components/content/messages";

export const emacs: CommandModule = {
  meta: { name: "emacs", aliases: [], description: "", usage: "emacs", hidden: true },
  run: () => <ErrorLine>command not found (this is a vim household)</ErrorLine>,
};

export const nano: CommandModule = {
  meta: { name: "nano", aliases: ["pico"], description: "", usage: "nano", hidden: true },
  run: () => <p className="text-fg">bold of you to ask</p>,
};

export const ping: CommandModule = {
  meta: { name: "ping", aliases: [], description: "", usage: "ping [host]", hidden: true },
  run: (ctx) => (
    <p className="font-mono text-sm text-fg">
      pong from {ctx.args[0] ?? "localhost"}: icmp_seq=1 ttl=64 time=0.042 ms
    </p>
  ),
};

export const make: CommandModule = {
  meta: { name: "make", aliases: [], description: "", usage: "make <target>", hidden: true },
  run: (ctx) => {
    const target = ctx.args[0];
    if (!target) {
      return <ErrorLine>make: *** No targets specified and no makefile found. Stop.</ErrorLine>;
    }
    return <ErrorLine>{`make: *** No rule to make target '${target}'.  Stop.`}</ErrorLine>;
  },
};

export const touchCmd: CommandModule = {
  meta: { name: "touch", aliases: [], description: "", usage: "touch <file>", hidden: true },
  run: (ctx) => (
    <ErrorLine>{`touch: cannot touch '${ctx.args[0] ?? "file"}': Read-only file system`}</ErrorLine>
  ),
};

export const mkdirCmd: CommandModule = {
  meta: { name: "mkdir", aliases: [], description: "", usage: "mkdir <dir>", hidden: true },
  run: (ctx) => (
    <ErrorLine>
      {`mkdir: cannot create directory '${ctx.args[0] ?? "dir"}': Read-only file system`}
    </ErrorLine>
  ),
};
