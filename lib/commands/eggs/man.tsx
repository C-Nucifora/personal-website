import type { CommandModule } from "../registry";
import { ErrorLine } from "@/components/content/messages";
import { CmdLink } from "@/components/terminal/output/CmdLink";
import { profile } from "@/data/profile";
import { skills } from "@/data/resume";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-sm font-bold text-accent">{title}</p>
      <div className="pl-6 font-mono text-sm text-fg">{children}</div>
    </div>
  );
}

function ManChristian() {
  const flags = skills.flatMap((g) => g.items.filter((i) => !i.startsWith("TODO"))).slice(0, 6);
  return (
    <div className="max-w-2xl space-y-3">
      <p className="flex justify-between font-mono text-xs text-muted">
        <span>CHRISTIAN(1)</span>
        <span>General Commands Manual</span>
        <span>CHRISTIAN(1)</span>
      </p>
      <Section title="NAME">
        christian — {profile.role.replace(/^TODO\s*/, "").toLowerCase() || "developer"}
      </Section>
      <Section title="SYNOPSIS">
        christian [--coffee] [--focus] [--ship] &lt;problem&gt;
      </Section>
      <Section title="DESCRIPTION">
        Takes underspecified problems and returns working software. Known to
        refactor toward simplicity, write actual commit messages, and read
        the documentation before asking.
      </Section>
      <Section title="OPTIONS">
        {flags.map((f) => (
          <p key={f}>
            <span className="text-ansi-cyan">--{f.toLowerCase().replace(/[^a-z0-9]+/g, "-")}</span>
          </p>
        ))}
      </Section>
      <Section title="KNOWN BUGS">occasionally refactors things that were fine</Section>
      <Section title="SEE ALSO">
        <CmdLink cmd="cat ~/contact/contact.md" label="contact(1)" />
      </Section>
    </div>
  );
}

export const man: CommandModule = {
  meta: {
    name: "man",
    aliases: [],
    description: "Manual pages.",
    usage: "man <page>",
    hidden: true,
  },
  run: (ctx) => {
    const page = ctx.args[0];
    if (!page) {
      return <ErrorLine>What manual page do you want?</ErrorLine>;
    }
    if (page.toLowerCase() === "christian") {
      return <ManChristian />;
    }
    return (
      <ErrorLine>
        No manual entry for {page} (try: <CmdLink cmd="man christian" />)
      </ErrorLine>
    );
  },
};
