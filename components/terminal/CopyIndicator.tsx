"use client";

import { useEffect, useState } from "react";
import { getPaneById } from "@/lib/terminal/reducer";
import { getScroller, LINE_PX } from "@/lib/terminal/scroll-registry";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";
import type { WindowKey } from "@/lib/terminal/types";

interface CopyIndicatorProps {
  windowKey: WindowKey;
  paneId: string;
}

/** tmux-style `[123/456]` position badge, top-right, COPY mode only (§6.3). */
export function CopyIndicator({ windowKey, paneId }: CopyIndicatorProps) {
  const inCopy = useTerminalStore(
    (s) => getPaneById(s, windowKey, paneId)?.mode === "COPY",
  );
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!inCopy) return;
    const el = getScroller(`${windowKey}:${paneId}`);
    if (!el) return;
    const update = () => {
      const current = Math.ceil((el.scrollTop + el.clientHeight) / LINE_PX);
      const total = Math.max(current, Math.ceil(el.scrollHeight / LINE_PX));
      setLabel(`[${current}/${total}]`);
    };
    const id = requestAnimationFrame(update);
    el.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(id);
      el.removeEventListener("scroll", update);
    };
  }, [inCopy, windowKey, paneId]);

  if (!inCopy) return null;
  return (
    <div className="pointer-events-none sticky top-0 z-10 flex justify-end">
      <span className="rounded-bl bg-warning px-1.5 py-0.5 font-mono text-xs font-semibold text-[var(--bg-window)]">
        {label}
      </span>
    </div>
  );
}
