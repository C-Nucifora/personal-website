"use client";

import { lazy, Suspense } from "react";
import type { WindowKey } from "@/lib/terminal/types";

const Impl = lazy(() => import("./VimViewerImpl"));

export interface VimViewerProps {
  windowKey: WindowKey;
  paneId: string;
  path: string;
  note: string | null;
}

/**
 * Lazy shell for the read-only vim viewer (FLOW §8.1): CodeMirror and the
 * vim emulation load on first `vim`, never on page load.
 */
export function VimViewer(props: VimViewerProps) {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-4 font-mono text-sm text-muted">
          opening {props.path.split("/").pop()}…
        </p>
      }
    >
      <Impl {...props} />
    </Suspense>
  );
}
