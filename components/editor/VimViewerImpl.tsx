"use client";

import { useEffect, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  lineNumbers,
} from "@codemirror/view";
import { syntaxHighlighting } from "@codemirror/language";
import { classHighlighter } from "@lezer/highlight";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { markdown } from "@codemirror/lang-markdown";
import { Vim, vim } from "@replit/codemirror-vim";
import { setDiagnostics } from "@codemirror/lint";
import { readFile } from "@/lib/vfs/tree";
import { store } from "@/lib/terminal/store";
import { projectFilesFor, relativeTo } from "@/lib/intel/project-files";
import { providerFor } from "@/lib/intel/registry";
import type { VfsLanguage } from "@/lib/vfs/types";
import { defineIntelVimCommands, intelCtx, intelSupport } from "./intel";
import type { VimViewerProps } from "./VimViewer";

function languageExtension(language: VfsLanguage) {
  switch (language) {
    case "typescript":
      return [javascript({ typescript: true })];
    case "tsx":
      return [javascript({ typescript: true, jsx: true })];
    case "javascript":
      return [javascript()];
    case "json":
      return [json()];
    case "css":
      return [css()];
    case "html":
      return [html()];
    case "markdown":
      return [markdown()];
    default:
      return [];
  }
}

/** Per-view hooks for the global Ex commands (defineEx is vim-global). */
interface ViewerHooks {
  close(): void;
  message(text: string): void;
}
const hooks = new Map<EditorView, ViewerHooks>();

function hooksFor(cm: { cm6?: EditorView }): ViewerHooks | undefined {
  return cm.cm6 ? hooks.get(cm.cm6) : undefined;
}

const SMILE = String.raw`
                           oooo$$$$$$$$$$$$oooo
                       oo$$$$$$$$$$$$$$$$$$$$$$$$o
                    oo$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$o
                    o$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$o
                  o$$$$$$$$$     $$$$$$$$$$$$$    $$$$$$o
                 o$$$$$$$$$      $$$$$$$$$$$      $$$$$$$o
                 $$$$$$$$$$      $$$$$$$$$$$      $$$$$$$$
                  "$$$$$$$"      $$$$$$$$$$$      "$$$$$$"
                    $$$$   o$$$$$$$$$$$$$$$$$$$o   $$$$
                    $$$$oo$$$$$$$$$$$$$$$$$$$$$$$oo$$$$
                     "$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$"
                       "$$$$$$$$$$$$$$$$$$$$$$$$$$$"
                          """$$$$$$$$$$$$$$$$$"""`;

const HELP_42 = `*usr_42.txt*   What is the meaning of life, the universe and everything?

Douglas Adams, the only person who knew what this question really was
about, is now dead, unfortunately.  So now you might wonder what the
meaning of computers is...                                       *42*`;

const HELP_GRAIL = `*holy-grail*

You found it, Arthur!  (In real vim this lands on the Ex commands
overview — every ":" command that ever was.  Try :help there.)`;

const HELP_BORED = `*UserGettingBored*

UserGettingBored        When the user presses the same key 42 times.
                        Just kidding! :-)`;

const HELP_SHEET = `viewer help
  :q          close the file        /pattern    search (n/N to repeat)
  :{number}   jump to a line        v V + y     select and yank (copies)
  gg G        top / bottom          Ctrl+b …    tmux keys still work
read-only: this is vim -M — looking, not touching.`;

let exDefined = false;

function defineExCommands(): void {
  if (exDefined) return;
  exDefined = true;

  Vim.defineEx("quit", "q", (cm: { cm6?: EditorView }) => hooksFor(cm)?.close());
  Vim.defineEx("write", "w", (cm: { cm6?: EditorView }) =>
    hooksFor(cm)?.message("E45: 'readonly' option is set (add ! to override — it won't help)"),
  );
  Vim.defineEx("wq", "wq", (cm: { cm6?: EditorView }) =>
    hooksFor(cm)?.message("E45: 'readonly' option is set"),
  );
  Vim.defineEx("smile", "smi", (cm: { cm6?: EditorView }) =>
    hooksFor(cm)?.message(SMILE),
  );
  Vim.defineEx(
    "help",
    "h",
    (cm: { cm6?: EditorView }, params: { args?: string[] }) => {
      const topic = params.args?.[0] ?? "";
      const text =
        topic === "42"
          ? HELP_42
          : topic === "holy-grail"
            ? HELP_GRAIL
            : topic === "UserGettingBored"
              ? HELP_BORED
              : HELP_SHEET;
      hooksFor(cm)?.message(text);
    },
  );

  // Edit attempts get vim's authentic answer (§8.1) — the joke and the
  // boundary in one move. Yank and visual selection stay untouched.
  Vim.defineAction("showReadonly", (cm: { cm6?: EditorView }) => {
    hooksFor(cm)?.message("E21: Cannot make changes, 'modifiable' is off");
  });
  for (const key of ["i", "a", "I", "A", "o", "O", "x", "X", "s", "S", "c", "C", "d", "D", "p", "P", "r", "R", "~", "J"]) {
    Vim.mapCommand(key, "action", "showReadonly", {}, { context: "normal" });
  }
}

export default function VimViewerImpl({
  windowKey,
  path,
  note,
  offset,
}: Omit<VimViewerProps, "paneId">) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ line: 1, col: 1, pct: 0 });
  const [message, setMessage] = useState<string | null>(note);
  const [hintDismissed, setHintDismissed] = useState(false);

  const file = readFile(path);
  const fileName = path.startsWith("~/") ? path.split("/").slice(-2).join("/") : path;

  const close = () => store.dispatch({ type: "close-editor", windowKey });

  useEffect(() => {
    if (!file || !containerRef.current) return;
    defineExCommands();
    defineIntelVimCommands();

    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: file.raw,
        extensions: [
          vim({ status: true }),
          lineNumbers({
            // rnu+nu: relative numbers, absolute on the cursor line (§8.1)
            formatNumber: (n, state) => {
              const cur = state.doc.lineAt(state.selection.main.head).number;
              return n === cur ? String(n) : String(Math.abs(n - cur));
            },
          }),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          ...languageExtension(file.language),
          syntaxHighlighting(classHighlighter),
          intelSupport(),
          EditorState.readOnly.of(true),
          EditorView.updateListener.of((u) => {
            if (!u.selectionSet && !u.docChanged && !u.viewportChanged) return;
            const line = u.state.doc.lineAt(u.state.selection.main.head);
            setPos({
              line: line.number,
              col: u.state.selection.main.head - line.from + 1,
              pct: Math.min(100, Math.round((line.number / u.state.doc.lines) * 100)),
            });
          }),
          EditorView.theme({
            "&": { height: "100%", backgroundColor: "transparent" },
            ".cm-scroller": {
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              fontSize: "0.875rem",
              lineHeight: "1.6",
            },
            ".cm-gutters": {
              backgroundColor: "transparent",
              color: "var(--fg-subtle)",
              border: "none",
            },
            ".cm-activeLine": { backgroundColor: "var(--bg-selection)" },
            ".cm-activeLineGutter": {
              backgroundColor: "transparent",
              color: "var(--accent)",
            },
            ".cm-cursor, .cm-fatCursor": {
              borderLeftColor: "var(--accent)",
              backgroundColor: "var(--accent)",
            },
            "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
              backgroundColor: "var(--bg-selection)",
            },
            ".cm-panels": {
              backgroundColor: "var(--bg-elevated)",
              color: "var(--fg)",
              borderTop: "1px solid var(--border)",
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
            },
          }),
        ],
      }),
    });

    hooks.set(view, { close, message: (text) => setMessage(text) });

    // gd landings: place the cursor where the definition lives (§8.2).
    if (offset != null) {
      const pos = Math.min(offset, view.state.doc.length);
      view.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: "center" }),
      });
    }

    // Language intelligence: silent best-effort. The registry resolves to
    // null for unknown languages or failed workers — tier 1, no UI.
    let intelCancelled = false;
    const pf = projectFilesFor(path);
    const rel = pf ? relativeTo(pf.root, path) : null;
    if (pf && rel) {
      intelCtx.set(view, {
        provider: null,
        relPath: rel,
        vfsPath: path,
        root: pf.root,
        windowKey,
        openFile: (vfsPath, targetOffset) =>
          store.dispatch({ type: "open-editor", windowKey, path: vfsPath, offset: targetOffset }),
        message: (text) => setMessage(text),
      });
      void providerFor(file.language, pf.root, pf.files).then((provider) => {
        if (intelCancelled || !provider) return;
        const ctx = intelCtx.get(view);
        if (ctx) ctx.provider = provider;
        void provider.diagnostics(rel).then((diags) => {
          if (intelCancelled) return;
          const len = view.state.doc.length;
          view.dispatch(
            setDiagnostics(
              view.state,
              diags.map((d) => ({
                from: Math.min(d.from, len),
                to: Math.min(Math.max(d.to, d.from), len),
                severity: d.severity,
                message: d.message,
              })),
            ),
          );
        });
      });
    }

    // Visual-mode yank also writes the system clipboard — the one place
    // clipboard integration exists (§8.1).
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "y") return;
      const sel = view.state.selection.main;
      if (sel.empty) return;
      const text = view.state.sliceDoc(sel.from, sel.to);
      navigator.clipboard?.writeText(text).catch(() => {});
    };
    view.dom.addEventListener("keydown", onKeyDown);
    view.focus();

    return () => {
      intelCancelled = true;
      view.dom.removeEventListener("keydown", onKeyDown);
      hooks.delete(view);
      intelCtx.delete(view);
      view.destroy();
    };
    // The viewer is recreated per file open; everything else lives inside CM.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  if (!file) {
    return <p className="px-4 py-4 font-mono text-sm text-error">vim: cannot open {path}</p>;
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col" data-editor={path}>
      {!hintDismissed && (
        <div className="flex items-center justify-between gap-2 border-b border-border bg-elevated px-3 py-1 font-mono text-xs text-muted">
          <span>:q to close · / to search · scroll works too</span>
          <button
            type="button"
            aria-label="Dismiss hint"
            onClick={() => setHintDismissed(true)}
            className="cursor-pointer px-1 hover:text-fg"
          >
            ✕
          </button>
        </div>
      )}

      <button
        type="button"
        aria-label="Close file"
        title=":q"
        onClick={close}
        className="absolute right-2 top-8 z-10 cursor-pointer rounded border border-border bg-elevated px-1.5 font-mono text-xs text-muted hover:text-error"
      >
        ✕
      </button>

      <div ref={containerRef} className="min-h-0 flex-1 overflow-hidden" />

      {message && (
        <button
          type="button"
          onClick={() => setMessage(null)}
          className="max-h-64 cursor-pointer overflow-y-auto border-t border-border bg-elevated px-3 py-1 text-left"
        >
          <pre className="whitespace-pre-wrap font-mono text-xs text-warning">{message}</pre>
        </button>
      )}

      <div className="flex items-center gap-3 border-t border-border bg-elevated px-3 py-1 font-mono text-xs text-muted">
        <span className="text-fg">{fileName}</span>
        <span className="text-warning">[RO]</span>
        <span className="ml-auto">
          {pos.line}:{pos.col}
        </span>
        <span>{pos.pct}%</span>
      </div>
    </div>
  );
}
