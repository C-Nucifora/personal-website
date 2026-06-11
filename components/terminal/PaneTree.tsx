"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";
import { CopyIndicator } from "./CopyIndicator";
import { PaneScrollback } from "./PaneScrollback";
import { Prompt } from "./Prompt";
import { VimViewer } from "@/components/editor/VimViewer";
import { TmuxClock } from "@/components/effects/TmuxClock";
import { SlTrain } from "@/components/effects/SlTrain";
import { TopTable } from "@/components/effects/TopTable";
import { registerScroller } from "@/lib/terminal/scroll-registry";
import { activeWindowKey, getPaneById, getWindow } from "@/lib/terminal/reducer";
import { store } from "@/lib/terminal/store";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";
import type { PaneLayout, WindowId, WindowKey } from "@/lib/terminal/types";

function PaneView({
  windowKey,
  paneId,
  framed,
}: {
  windowKey: WindowKey;
  paneId: string;
  framed: boolean;
}) {
  const isActive = useTerminalStore((s) => getWindow(s, windowKey).activePane === paneId);
  const view = useTerminalStore((s) => getPaneById(s, windowKey, paneId)?.view ?? "shell");
  const editorPath = useTerminalStore(
    (s) => getPaneById(s, windowKey, paneId)?.editorPath ?? null,
  );
  const editorNote = useTerminalStore(
    (s) => getPaneById(s, windowKey, paneId)?.editorNote ?? null,
  );
  const overlay = useTerminalStore((s) =>
    activeWindowKey(s) === windowKey && getWindow(s, windowKey).activePane === paneId
      ? s.overlay
      : null,
  );

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (windowKey !== "lobby" && !isActive) {
      store.dispatch({ type: "focus-pane", window: windowKey as WindowId, paneId });
    }
    if (view === "editor") return;
    if (window.getSelection()?.toString()) return;
    if ((e.target as HTMLElement).closest("a,button,select,input,textarea,label")) return;
    e.currentTarget
      .querySelector<HTMLInputElement>("input[aria-label='Terminal command input']")
      ?.focus({ preventScroll: true });
  };

  return (
    <div
      data-pane-scroll
      data-pane-id={paneId}
      ref={(el) => registerScroller(`${windowKey}:${paneId}`, el)}
      onClick={onClick}
      className={[
        "relative min-h-0 min-w-0 flex-1",
        view === "editor" ? "overflow-hidden" : "space-y-4 overflow-y-auto px-4 py-4 sm:px-5",
        // Active pane: bright border; inactive: dim (§7.3) — only when split.
        framed ? "border" : "",
        framed && isActive ? "border-accent" : framed ? "border-border" : "",
      ].join(" ")}
    >
      {view === "editor" && editorPath ? (
        <VimViewer windowKey={windowKey} paneId={paneId} path={editorPath} note={editorNote} />
      ) : (
        <>
          <CopyIndicator windowKey={windowKey} paneId={paneId} />
          <PaneScrollback windowKey={windowKey} paneId={paneId} />
          <Prompt windowKey={windowKey} paneId={paneId} />
        </>
      )}
      {overlay === "clock" && <TmuxClock />}
      {overlay === "sl" && <SlTrain />}
      {(overlay === "top" || overlay === "htop") && <TopTable fancy={overlay === "htop"} />}
    </div>
  );
}

const MIN_PANE_W = 170;
const MIN_PANE_H = 132;

function Divider({
  windowKey,
  splitId,
  dir,
}: {
  windowKey: WindowKey;
  splitId: string;
  dir: "row" | "col";
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (windowKey === "lobby") return;
    const container = ref.current?.parentElement;
    if (!container) return;
    e.preventDefault();
    ref.current!.setPointerCapture(e.pointerId);
    const rect = container.getBoundingClientRect();

    const onMove = (ev: globalThis.PointerEvent) => {
      const [pos, size, min] =
        dir === "row"
          ? [ev.clientX - rect.left, rect.width, MIN_PANE_W]
          : [ev.clientY - rect.top, rect.height, MIN_PANE_H];
      const clamped = Math.max(min, Math.min(size - min, pos));
      store.dispatch({
        type: "set-ratio",
        window: windowKey as WindowId,
        splitId,
        ratio: clamped / size,
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation={dir === "row" ? "vertical" : "horizontal"}
      onPointerDown={onPointerDown}
      className={[
        "shrink-0 bg-border transition-colors hover:bg-accent/60",
        dir === "row" ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize",
      ].join(" ")}
    />
  );
}

function LayoutNode({
  windowKey,
  node,
  framed,
}: {
  windowKey: WindowKey;
  node: PaneLayout;
  framed: boolean;
}) {
  if (node.type === "leaf") {
    return <PaneView windowKey={windowKey} paneId={node.paneId} framed={framed} />;
  }
  return (
    <div
      className={["flex min-h-0 min-w-0 flex-1", node.dir === "row" ? "flex-row" : "flex-col"].join(
        " ",
      )}
    >
      <div
        style={{ flexBasis: `${node.ratio * 100}%` }}
        className="flex min-h-0 min-w-0 shrink grow-0"
      >
        <LayoutNode windowKey={windowKey} node={node.a} framed={framed} />
      </div>
      <Divider windowKey={windowKey} splitId={node.id} dir={node.dir} />
      <div className="flex min-h-0 min-w-0 flex-1">
        <LayoutNode windowKey={windowKey} node={node.b} framed={framed} />
      </div>
    </div>
  );
}

/** A window's pane layout: the binary split tree rendered with flexbox (§12.4). */
export function PaneTree({ windowKey }: { windowKey: WindowKey }) {
  const layout = useTerminalStore((s) => getWindow(s, windowKey).layout);
  const zoomed = useTerminalStore((s) => getWindow(s, windowKey).zoomed);
  const paneCount = useTerminalStore((s) => getWindow(s, windowKey).panes.length);

  if (zoomed) {
    return <PaneView windowKey={windowKey} paneId={zoomed} framed />;
  }
  return <LayoutNode windowKey={windowKey} node={layout} framed={paneCount > 1} />;
}
