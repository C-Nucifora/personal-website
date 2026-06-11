import type { CommandModule } from "../registry";
import { ErrorLine } from "@/components/content/messages";
import { projects } from "@/data/projects";
import { windowForPath } from "@/lib/vfs/path";

/** The project whose directory contains the cwd, if any. */
function projectForCwd(cwd: string) {
  if (windowForPath(cwd) !== "projects") return null;
  const slug = cwd.split("/")[2];
  return projects.find((p) => p.slug === slug) ?? null;
}

export const git: CommandModule = {
  meta: {
    name: "git",
    aliases: [],
    description: "Version control.",
    usage: "git <command>",
    hidden: true,
  },
  run: (ctx) => {
    const [sub, ...rest] = ctx.args;

    if (sub === "push" && rest.includes("--force")) {
      return <ErrorLine>denied: not on main. not ever.</ErrorLine>;
    }
    if (sub === "blame") {
      return <p className="text-fg">it was me. it&apos;s always me.</p>;
    }

    const project = projectForCwd(ctx.cwd);
    if (!project) {
      return (
        <ErrorLine>
          fatal: not a git repository (or any of the parent directories): .git
        </ErrorLine>
      );
    }

    if (sub === "log" || sub === undefined) {
      const commits = project.commits ?? [
        { hash: "a11c0de", date: "", message: "init (history withheld to protect the guilty)" },
      ];
      return (
        <div className="space-y-1 font-mono text-sm">
          {commits.map((c) => (
            <p key={c.hash}>
              <span className="text-ansi-yellow">{c.hash}</span>{" "}
              <span className="text-fg">{c.message}</span>
              {c.date && <span className="text-muted"> ({c.date})</span>}
            </p>
          ))}
        </div>
      );
    }
    if (sub === "status") {
      return (
        <p className="font-mono text-sm text-fg">
          On branch main{"\n"}nothing to commit, working tree clean (suspiciously)
        </p>
      );
    }
    return (
      <ErrorLine>{`git: '${sub}' is not a git command. See 'git --help'.`}</ErrorLine>
    );
  },
};
