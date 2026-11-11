/**
 * The one command executor (FLOW.md §12.1). Typed lines, clicked tabs,
 * clickable output, and keybinding-driven navigation all end up here; there
 * is no second code path that mutates terminal state.
 */
import type { ReactNode } from "react";
import {
  commandMetas,
  resolveCommand,
  type CommandContext,
} from "@/lib/commands/registry";
import { listDir, readFile, resolveNode } from "@/lib/vfs/tree";
import { resolvePath } from "@/lib/vfs/path";
import { loadProjectSources, projectSourcesLoaded } from "@/lib/vfs/project-sources";
import { ErrorLine } from "@/components/content/messages";
import { CmdLink } from "@/components/terminal/output/CmdLink";
import { activeWindowKey, getPane } from "./reducer";
import { store } from "./store";
import { getThemeEnv } from "./env";
import { levenshtein } from "./levenshtein";
import { setRunClickImpl, runClick } from "./run-click";
import type { WindowId, WindowKey } from "./types";

export interface ExecOptions {
  source: "typed" | "click" | "auto";
  /** Run in a specific shell instead of the active one (auto-display). */
  windowKey?: WindowKey;
}

/** First-entry auto-display commands (FLOW.md §2.1). */
export const AUTO_DISPLAY: Record<WindowId, string> = {
  about: "cat about.md",
  projects: "ls",
  resume: "cat resume.md",
  contact: "cat contact.md",
  help: "cat guide.md",
  blog: "ls",
};

const SECTION_WORDS = new Set(["about", "projects", "resume", "contact"]);

function UnknownCommand({ name }: { name: string }) {
  if (SECTION_WORDS.has(name)) {
    // Absolute path so the suggestion works from any cwd.
    return (
      <ErrorLine>
        command not found: {name} — did you mean <CmdLink cmd={`cd ~/${name}`} />?
      </ErrorLine>
    );
  }
  const near = commandMetas
    .filter((m) => !m.hidden)
    .map((m) => m.name)
    .find((n) => levenshtein(n, name.toLowerCase()) === 1);
  if (near) {
    return (
      <ErrorLine>
        command not found: {name} (did you mean {"'"}
        <CmdLink cmd={near} />
        {"'"}?)
      </ErrorLine>
    );
  }
  return (
    <ErrorLine>
      command not found: {name} — try {"'"}
      <CmdLink cmd="help" />
      {"'"}
    </ErrorLine>
  );
}

/** After any navigation: first activation of a window auto-runs its command. */
export function ensureWindowDisplayed(): void {
  const state = store.getState();
  const win = state.activeWindow;
  if (!win || state.windows[win].visited) return;
  store.dispatch({ type: "mark-visited", window: win });
  executeCommand(AUTO_DISPLAY[win], { source: "auto", windowKey: win });
}

export function executeCommand(line: string, opts: ExecOptions): void | Promise<void> {
  if (line.length > 4096) {
    store.dispatch({ type: "append-line", windowKey: opts.windowKey ?? activeWindowKey(store.getState()), command: null, node: <ErrorLine>command too long: limit is 4096 characters</ErrorLine> });
    return;
  }
  const trimmed = line.trim();
  if (!trimmed) return;

  const startState = store.getState();
  const windowKey = opts.windowKey ?? activeWindowKey(startState);

  // History expansion: !{n}
  let cmdLine = trimmed;
  const bang = /^!(\d+)$/.exec(trimmed);
  if (bang) {
    const entry = startState.history[Number(bang[1]) - 1];
    if (!entry) {
      store.dispatch({ type: "append-line", windowKey, command: trimmed, node: null });
      store.dispatch({
        type: "append-line",
        windowKey,
        command: null,
        node: <ErrorLine>{trimmed}: event not found</ErrorLine>,
      });
      return;
    }
    cmdLine = entry;
  }

  // Vim habits at the shell prompt (EASTER_EGGS §2).
  if (cmdLine === ":q" || cmdLine === ":q!") {
    store.dispatch({ type: "append-line", windowKey, command: cmdLine, node: null });
    store.dispatch({
      type: "append-line",
      windowKey,
      command: null,
      node: <p className="text-fg">you&apos;re not in vim. yet.</p>,
    });
    store.dispatch({ type: "history-append", line: cmdLine });
    return;
  }
  if (cmdLine === ":wq" || cmdLine === ":x") {
    store.dispatch({ type: "append-line", windowKey, command: cmdLine, node: null });
    store.dispatch({
      type: "append-line",
      windowKey,
      command: null,
      node: <p className="text-fg">nothing to write. nothing to quit. take a breath.</p>,
    });
    store.dispatch({ type: "history-append", line: cmdLine });
    return;
  }

  const [name, ...args] = cmdLine.split(/\s+/);
  const mod = resolveCommand(name);
  const pane = getPane(startState, windowKey);
  const sourcePath = args.find((arg) => !arg.startsWith("-")) ?? "";
  const targetPath = resolvePath(pane.cwd, sourcePath);
  const projectSlug = targetPath.startsWith("~/projects/") ? targetPath.split("/")[2] : "";
  if (!projectSourcesLoaded() && mod && ["cat", "vim", "ls", "tree", "cd"].includes(mod.meta.name) &&
      projectSlug && projectSlug !== "terminal-portfolio" && resolveNode(`~/projects/${projectSlug}`)?.kind === "dir" &&
      (!resolveNode(targetPath) || ["ls", "tree"].includes(mod.meta.name))) {
    const canResume = () => {
      const state = store.getState();
      const current = getPane(state, windowKey);
      return current.id === pane.id && current.cwd === pane.cwd &&
        (mod.meta.name !== "cd" || state.navigationVersion === startState.navigationVersion);
    };
    store.dispatch({ type: "set-notice", text: "Loading project sources…", until: Date.now() + 5000 });
    return loadProjectSources().then(() => {
      // Reads may finish in an unchanged background shell; navigation must still be current.
      if (!canResume()) {
        store.dispatch({ type: "set-notice", text: "Project sources loaded. Run the command again in your current shell.", until: Date.now() + 5000 });
        return;
      }
      return executeCommand(cmdLine, { ...opts, windowKey });
    }).catch(() => {
      if (!canResume()) {
        store.dispatch({ type: "set-notice", text: "Source unavailable offline. Try the command again when connected.", until: Date.now() + 5000 });
        return;
      }
      store.dispatch({ type: "append-line", windowKey, command: cmdLine, cwd: pane.cwd, node: null });
      store.dispatch({ type: "append-line", windowKey, command: null, node: <ErrorLine>Source unavailable offline. Try the command again when connected.</ErrorLine> });
      store.dispatch({ type: "history-append", line: cmdLine });
    });
  }

  // Echo first — typed and clicked sessions read identically in scrollback.
  store.dispatch({
    type: "append-line",
    windowKey,
    command: cmdLine,
    cwd: getPane(store.getState(), windowKey).cwd,
    node: null,
  });

  let cleared = false;
  const ctx: CommandContext = {
    args,
    raw: cmdLine,
    get cwd() {
      return getPane(store.getState(), windowKey).cwd;
    },
    get prevCwd() {
      return getPane(store.getState(), windowKey).prevCwd;
    },
    windowKey,
    resolve: (input) => resolvePath(getPane(store.getState(), windowKey).cwd, input),
    node: resolveNode,
    read: readFile,
    list: listDir,
    write: (node) =>
      store.dispatch({ type: "append-line", windowKey, command: null, node }),
    clear: () => {
      cleared = true;
    },
    setCwd: (path) => store.dispatch({ type: "set-cwd", windowKey, path }),
    openEditor: (path, note) =>
      store.dispatch({ type: "open-editor", windowKey, path, note }),
    notify: (text) =>
      store.dispatch({ type: "set-notice", text, until: Date.now() + 3000 }),
    confirmOpenUrl: (url) =>
      store.dispatch({ type: "set-confirm", confirm: { kind: "openUrl", payload: url } }),
    startOverlay: (kind) => store.dispatch({ type: "set-overlay", overlay: kind }),
    runClick,
    history: startState.history,
    getThemeId: () => getThemeEnv().getThemeId(),
    setTheme: (id) => getThemeEnv().setTheme(id),
    commands: commandMetas,
  };

  const node: ReactNode = mod ? mod.run(ctx) : <UnknownCommand name={name} />;

  if (cleared) {
    store.dispatch({ type: "clear-scrollback", windowKey });
  } else if (node !== null && node !== undefined) {
    store.dispatch({ type: "append-line", windowKey, command: null, node });
  }

  store.dispatch({ type: "history-append", line: cmdLine });

  // cd into an unvisited window? Its shell runs its first-entry command.
  ensureWindowDisplayed();
}

// Default click behavior: execute directly. The animation engine (FLOW §5)
// replaces this with the type-on version without touching any caller.
setRunClickImpl((cmd) => executeCommand(cmd, { source: "click" }));
