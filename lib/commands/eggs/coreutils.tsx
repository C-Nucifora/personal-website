/** Fake coreutils (EASTER_EGGS §1.1) — same parser path, same global rules. */
import type { CommandModule } from "../registry";
import { ErrorLine } from "@/components/content/messages";
import { randomFortune } from "@/data/fortunes";
import { figletRender } from "@/data/figlet-font";

export const fortune: CommandModule = {
  meta: { name: "fortune", aliases: [], description: "", usage: "fortune", hidden: true },
  run: () => <p className="max-w-prose text-fg">{randomFortune()}</p>,
};

const COW = String.raw`
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||`;

export const cowsay: CommandModule = {
  meta: { name: "cowsay", aliases: [], description: "", usage: "cowsay [text]", hidden: true },
  run: (ctx) => {
    const text = ctx.args.join(" ") || randomFortune();
    const lines: string[] = [];
    for (let i = 0; i < text.length; i += 40) lines.push(text.slice(i, i + 40));
    const width = Math.max(...lines.map((l) => l.length));
    const bubble = [
      " " + "_".repeat(width + 2),
      ...lines.map(
        (l, i) =>
          (lines.length === 1
            ? `< ${l} >`
            : i === 0
              ? `/ ${l.padEnd(width)} \\`
              : i === lines.length - 1
                ? `\\ ${l.padEnd(width)} /`
                : `| ${l.padEnd(width)} |`),
      ),
      " " + "-".repeat(width + 2),
    ].join("\n");
    return (
      <pre className="overflow-x-auto font-mono text-sm leading-snug text-fg">{bubble + COW}</pre>
    );
  },
};

export const figlet: CommandModule = {
  meta: { name: "figlet", aliases: [], description: "", usage: "figlet <text>", hidden: true },
  run: (ctx) => {
    const text = ctx.args.join(" ");
    if (!text) return <ErrorLine>figlet: what should I say? (figlet hello)</ErrorLine>;
    return (
      <pre className="overflow-x-auto font-mono text-sm leading-snug text-accent">
        {figletRender(text).join("\n")}
      </pre>
    );
  },
};

export const uname: CommandModule = {
  meta: { name: "uname", aliases: [], description: "", usage: "uname [-a]", hidden: true },
  run: (ctx) => {
    if (!ctx.args.includes("-a")) return <p className="font-mono text-sm text-fg">PortfolioOS</p>;
    const built = new Date().toDateString();
    return (
      <p className="font-mono text-sm text-fg">
        PortfolioOS christian 1.0.0-custom #1 SMP {built} ts/x86_64 GNU/TypeScript
      </p>
    );
  },
};

export const uptimeCmd: CommandModule = {
  meta: { name: "uptime", aliases: [], description: "", usage: "uptime", hidden: true },
  run: () => {
    const secs = Math.round(performance.now() / 1000);
    const mins = Math.floor(secs / 60);
    const up = mins > 0 ? `${mins} min${mins === 1 ? "" : "s"}` : `${secs} secs`;
    return (
      <p className="font-mono text-sm text-fg">
        up {up}, 1 user, load average: 0.00, 0.00, 0.00 (it&apos;s a static site)
      </p>
    );
  },
};

const DF_ROWS: [string, string, string, string, string, string][] = [
  ["Filesystem", "Size", "Used", "Avail", "Use%", "Mounted on"],
  ["/dev/coffee", "100G", "98G", "2G", "98%", "/home/christian"],
  ["/dev/focus", "16G", "15G", "1G", "94%", "/proc/attention"],
  ["tmpfs", "∞", "0", "∞", "0%", "/tmp/side-projects"],
  ["/dev/sleep", "8G", "5G", "3G", "63%", "/var/rest"],
];

export const df: CommandModule = {
  meta: { name: "df", aliases: [], description: "", usage: "df -h", hidden: true },
  run: () => (
    <pre className="overflow-x-auto font-mono text-sm text-fg">
      {DF_ROWS.map((r) =>
        r.map((c, i) => c.padEnd(i === 0 ? 12 : i === 5 ? 0 : 7)).join(""),
      ).join("\n")}
    </pre>
  ),
};

export const free: CommandModule = {
  meta: { name: "free", aliases: [], description: "", usage: "free -h", hidden: true },
  run: () => (
    <pre className="overflow-x-auto font-mono text-sm text-fg">
      {[
        "              total        used        free      shared",
        "Mem:           32Gi        31Gi       512Mi        tabs",
        "Swap:            0B          0B          0B (we don't do that here)",
      ].join("\n")}
    </pre>
  ),
};

export const which: CommandModule = {
  meta: { name: "which", aliases: [], description: "", usage: "which <cmd>", hidden: true },
  run: (ctx) => {
    const target = ctx.args[0];
    if (!target) return <ErrorLine>which: missing argument</ErrorLine>;
    if (target.toLowerCase() === "christian") {
      return <p className="font-mono text-sm text-fg">/usr/bin/hired (hopefully)</p>;
    }
    const wanted = target.toLowerCase();
    const known = ctx.commands.some(
      (m) => m.name === wanted || m.aliases.includes(wanted),
    );
    if (known) return <p className="font-mono text-sm text-fg">/usr/bin/{target}</p>;
    return <ErrorLine>{target} not found</ErrorLine>;
  },
};
