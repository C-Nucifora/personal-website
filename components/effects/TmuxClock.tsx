"use client";

import { useEffect, useState } from "react";
import { store } from "@/lib/terminal/store";

/**
 * Ctrl+b t: the tmux clock, played straight (EASTER_EGGS §3) — huge block
 * digits in the theme accent, filling the active pane. Any key or click
 * exits (the keyboard module handles keys; clicks land here).
 */

// 3x5 cell bitmaps, tmux-style.
const GLYPHS: Record<string, string[]> = {
  "0": ["###", "# #", "# #", "# #", "###"],
  "1": ["..#", "..#", "..#", "..#", "..#"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", "###", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", "..#", "..#", "..#"],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
  ":": [".", "#", ".", "#", "."],
};

function Glyph({ char }: { char: string }) {
  const rows = GLYPHS[char] ?? GLYPHS[":"];
  return (
    <div className="grid gap-[2px]" aria-hidden="true">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-[2px]">
          {[...row].map((cell, j) => (
            <span
              key={j}
              className="h-3 w-3 sm:h-4 sm:w-4"
              style={{ background: cell === "#" ? "var(--accent)" : "transparent" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function TmuxClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      role="presentation"
      onClick={() => store.dispatch({ type: "set-overlay", overlay: null })}
      className="absolute inset-0 z-20 flex items-center justify-center bg-window"
    >
      <div className="flex items-center gap-3" aria-label={`Clock: ${time}`}>
        {[...time].map((c, i) => (
          <Glyph key={i} char={c} />
        ))}
      </div>
    </div>
  );
}
