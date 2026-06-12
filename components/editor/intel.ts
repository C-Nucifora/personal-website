/**
 * Editor-side language intelligence (FLOW §8.2): K hover tooltip, gd with
 * a cross-file jumplist (Ctrl+o / Ctrl+i), and the :symbols outline. All
 * lookups go through a per-view IntelCtx; a missing provider makes every
 * command a silent no-op — tier 1 behavior, never an error state.
 */
import { StateEffect, StateField, type Extension } from "@codemirror/state";
import { EditorView, showTooltip, type Tooltip } from "@codemirror/view";
import { Vim } from "@replit/codemirror-vim";
import type { IntelProvider } from "@/lib/intel/types";
import type { WindowKey } from "@/lib/terminal/types";

export interface IntelCtx {
  provider: IntelProvider | null;
  /** Project-relative path of the open file (the provider's key). */
  relPath: string;
  /** Absolute vfs path of the open file. */
  vfsPath: string;
  /** "~/projects/<slug>" */
  root: string;
  windowKey: WindowKey;
  /** Open another project file in this pane (cross-file gd). */
  openFile(vfsPath: string, offset: number): void;
  message(text: string): void;
}

/** Per-view context, registered by VimViewerImpl on mount. */
export const intelCtx = new Map<EditorView, IntelCtx>();

function ctxFor(cm: { cm6?: EditorView }): IntelCtx | undefined {
  return cm.cm6 ? intelCtx.get(cm.cm6) : undefined;
}

// ---- hover tooltip --------------------------------------------------------

const setHover = StateEffect.define<{ pos: number; text: string } | null>();

const hoverField = StateField.define<Tooltip | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setHover)) {
        const payload = e.value;
        value = payload && {
          pos: payload.pos,
          above: true,
          create: () => {
            const dom = document.createElement("div");
            dom.className = "cm-intel-hover";
            dom.textContent = payload.text;
            return { dom };
          },
        };
      }
    }
    // Any cursor movement or scroll-by-keys dismisses the tooltip.
    if (tr.selection) value = null;
    return value;
  },
  provide: (f) => showTooltip.from(f),
});

const hoverTheme = EditorView.baseTheme({
  ".cm-tooltip:has(.cm-intel-hover)": {
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    maxWidth: "60ch",
  },
  ".cm-intel-hover": {
    padding: "6px 10px",
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
    fontSize: "0.8125rem",
    whiteSpace: "pre-wrap",
    color: "var(--fg)",
  },
});

/** The extension VimViewerImpl adds to every editor instance. */
export function intelSupport(): Extension {
  return [hoverField, hoverTheme];
}

// ---- jumplist (cross-file, per window) ------------------------------------

interface JumpLoc {
  vfsPath: string;
  offset: number;
}

const jumplists = new Map<WindowKey, { stack: JumpLoc[]; index: number }>();

function jumplist(windowKey: WindowKey) {
  let jl = jumplists.get(windowKey);
  if (!jl) {
    jl = { stack: [], index: -1 };
    jumplists.set(windowKey, jl);
  }
  return jl;
}

function goTo(view: EditorView, ctx: IntelCtx, loc: JumpLoc): void {
  if (loc.vfsPath === ctx.vfsPath) {
    const pos = Math.min(loc.offset, view.state.doc.length);
    view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: "center" }) });
  } else {
    ctx.openFile(loc.vfsPath, loc.offset);
  }
}

/** Test hook. */
export function clearJumplists(): void {
  jumplists.clear();
}

// ---- vim command registration (global, once) ------------------------------

let defined = false;

export function defineIntelVimCommands(): void {
  if (defined) return;
  defined = true;

  Vim.defineAction("intelHover", (cm: { cm6?: EditorView }) => {
    const view = cm.cm6;
    const ctx = view && intelCtx.get(view);
    if (!view || !ctx?.provider) return;
    const pos = view.state.selection.main.head;
    void ctx.provider.hover(ctx.relPath, pos).then((h) => {
      if (h && intelCtx.get(view) === ctx) {
        view.dispatch({ effects: setHover.of({ pos, text: h.text }) });
      }
    });
  });

  Vim.defineAction("intelGd", (cm: { cm6?: EditorView }) => {
    const view = cm.cm6;
    const ctx = view && intelCtx.get(view);
    if (!view || !ctx?.provider) return;
    const pos = view.state.selection.main.head;
    void ctx.provider.definition(ctx.relPath, pos).then((def) => {
      if (!def || intelCtx.get(view) !== ctx) return;
      const target: JumpLoc = { vfsPath: `${ctx.root}/${def.path}`, offset: def.offset };
      const jl = jumplist(ctx.windowKey);
      // A new jump truncates any forward history, like vim.
      jl.stack.splice(jl.index + 1);
      jl.stack.push({ vfsPath: ctx.vfsPath, offset: pos }, target);
      jl.index = jl.stack.length - 1;
      goTo(view, ctx, target);
    });
  });

  Vim.defineAction("intelJumpBack", (cm: { cm6?: EditorView }) => {
    const view = cm.cm6;
    const ctx = view && intelCtx.get(view);
    if (!view || !ctx) return;
    const jl = jumplist(ctx.windowKey);
    if (jl.index <= 0) return;
    jl.index -= 1;
    goTo(view, ctx, jl.stack[jl.index]);
  });

  Vim.defineAction("intelJumpForward", (cm: { cm6?: EditorView }) => {
    const view = cm.cm6;
    const ctx = view && intelCtx.get(view);
    if (!view || !ctx) return;
    const jl = jumplist(ctx.windowKey);
    if (jl.index >= jl.stack.length - 1) return;
    jl.index += 1;
    goTo(view, ctx, jl.stack[jl.index]);
  });

  Vim.mapCommand("K", "action", "intelHover", {}, { context: "normal" });
  Vim.mapCommand("gd", "action", "intelGd", {}, { context: "normal" });
  Vim.mapCommand("<C-o>", "action", "intelJumpBack", {}, { context: "normal" });
  Vim.mapCommand("<C-i>", "action", "intelJumpForward", {}, { context: "normal" });

  Vim.defineEx("symbols", "sym", (cm: { cm6?: EditorView }) => {
    const ctx = ctxFor(cm);
    if (!ctx) return;
    if (!ctx.provider) {
      ctx.message("symbols: no language intelligence for this file");
      return;
    }
    void ctx.provider.symbols(ctx.relPath).then((syms) => {
      if (syms.length === 0) {
        ctx.message("symbols: nothing to outline");
        return;
      }
      const lines = syms.map((s) => `:${String(s.line).padStart(4)}  ${s.kind.padEnd(10)} ${s.name}`);
      ctx.message(`document symbols\n${lines.join("\n")}`);
    });
  });
}
