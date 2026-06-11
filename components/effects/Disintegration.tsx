"use client";

import { useEffect, useState } from "react";
import { Fetch } from "@/components/content/Fetch";
import { useTheme } from "@/components/theme/ThemeProvider";
import { bundleInfo } from "@/data/generated/site-source";
import { store } from "@/lib/terminal/store";

/**
 * rm -rf / --no-preserve-root (EASTER_EGGS §4.2). A pure overlay: one beat
 * of silence, the chrome crumbles (CSS class on the terminal root), black,
 * then a BIOS boot that ends in the MOTD — and the untouched state is
 * exactly where it was. The egg destroys nothing.
 */

const BIOS_LINES = [
  "PortfolioOS BIOS v1.0.0 — © whenever",
  "CPU: 1 visitor @ full attention ............ ok",
  `Memory check: ${bundleInfo.bytes.toLocaleString()} bytes of curated source ... ok`,
  "Probing /dev/coffee ........................ 98% (refill soon)",
  "Loading portfolio kernel ................... ok",
  "Mounting ~ (read-only, obviously) .......... ok",
  "Restoring session from backup .............. ok",
  "",
  "nothing was lost. nothing is ever lost here.",
];

type Phase = "silence" | "crumble" | "black" | "bios";

export function Disintegration() {
  const [phase, setPhase] = useState<Phase>("silence");
  const [lineCount, setLineCount] = useState(0);
  const { themeId } = useTheme();

  // Phase timeline: 400ms silence → ≤2.5s crumble → 800ms black → BIOS.
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("crumble"), 400),
      setTimeout(() => setPhase("black"), 400 + 2200),
      setTimeout(() => setPhase("bios"), 400 + 2200 + 800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // The crumble is a class on the terminal root; the real UI falls apart
  // and reassembles untouched when the class leaves with this component.
  useEffect(() => {
    if (phase !== "crumble") return;
    const root = document.querySelector("[data-terminal-root]");
    root?.classList.add("disintegrating");
    return () => root?.classList.remove("disintegrating");
  }, [phase]);

  // BIOS lines type on.
  useEffect(() => {
    if (phase !== "bios") return;
    if (lineCount >= BIOS_LINES.length) {
      const done = setTimeout(
        () => store.dispatch({ type: "set-overlay", overlay: null }),
        2200,
      );
      return () => clearTimeout(done);
    }
    const id = setTimeout(() => setLineCount((n) => n + 1), 180);
    return () => clearTimeout(id);
  }, [phase, lineCount]);

  if (phase === "silence" || phase === "crumble") {
    // Present (so any keypress dismisses via the keyboard module) but
    // transparent while the chrome falls.
    return <div className="absolute inset-0 z-40" aria-hidden="true" />;
  }

  return (
    <div
      role="presentation"
      onClick={() => store.dispatch({ type: "set-overlay", overlay: null })}
      className="absolute inset-0 z-40 overflow-y-auto bg-black p-6"
    >
      {phase === "bios" && (
        <div className="space-y-1 font-mono text-sm text-[#33ff66]">
          {BIOS_LINES.slice(0, lineCount).map((l, i) => (
            <p key={i}>{l || " "}</p>
          ))}
          {lineCount >= BIOS_LINES.length && (
            <div className="pt-4 text-fg">
              <Fetch themeId={themeId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
