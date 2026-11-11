"use client";

import { Component, lazy, Suspense, type PropsWithChildren } from "react";
import { focusActivePrompt } from "@/lib/terminal/focus";
import { getPaneById } from "@/lib/terminal/reducer";
import { store } from "@/lib/terminal/store";
import type { WindowKey } from "@/lib/terminal/types";

const Impl = lazy(() => import("./VimViewerImpl"));

export interface VimViewerProps {
  windowKey: WindowKey;
  paneId: string;
  path: string;
  note: string | null;
  /** Initial cursor offset — set by intel gd jumps (FLOW §8.2). */
  offset: number | null;
}

// A missing editor chunk must not replace the surrounding portfolio with an error page.
class EditorBoundary extends Component<PropsWithChildren<VimViewerProps>, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  private close = () => {
    const { windowKey, paneId } = this.props;
    if (!getPaneById(store.getState(), windowKey, paneId)) return;
    if (windowKey !== "lobby") {
      store.dispatch({ type: "focus-pane", window: windowKey, paneId });
    }
    store.dispatch({ type: "close-editor", windowKey });
    focusActivePrompt();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="h-full space-y-3 overflow-y-auto px-4 py-4 font-mono text-sm">
        <p className="text-muted">The editor could not load. Return to the shell or use plain view to keep browsing.</p>
        <button
          type="button"
          onClick={this.close}
          className="min-h-11 rounded border border-border px-3 text-accent focus-visible:outline-2"
        >
          Return to shell
        </button>
      </div>
    );
  }
}

/**
 * Lazy shell for the read-only vim viewer (FLOW §8.1): CodeMirror and the
 * vim emulation load on first `vim`, never on page load.
 */
export function VimViewer(props: VimViewerProps) {
  return (
    <EditorBoundary key={props.path} {...props}>
      <Suspense
        fallback={
          <p className="px-4 py-4 font-mono text-sm text-muted">
            opening {props.path.split("/").pop()}…
          </p>
        }
      >
        <Impl {...props} />
      </Suspense>
    </EditorBoundary>
  );
}
