"use client";

import { store } from "@/lib/terminal/store";

/** Static fake process table for top/htop (EASTER_EGGS §1.1). q dismisses. */

const PROCS: [string, string, string, string, string][] = [
  ["PID", "USER", "STAT", "TIME", "COMMAND"],
  ["1", "christian", "S", "38y", "vim (38 years uptime)"],
  ["47", "christian", "S", "2:17", "side_project_47 (sleeping)"],
  ["666", "christian", "Z", "?:??", "impostor_syndrome (zombie)"],
  ["80", "root", "R", "9999h", "coffee.service (running)"],
  ["443", "christian", "S", "1:00", "tab_hoarder --count=312"],
  ["22", "visitor", "R", "0:01", "you_reading_this"],
];

function Bars() {
  const bars = [
    ["CPU", 42],
    ["Mem", 87],
    ["Swp", 0],
  ] as const;
  return (
    <div className="mb-3 space-y-1">
      {bars.map(([label, pct]) => (
        <p key={label} className="flex items-center gap-2">
          <span className="w-8 text-accent">{label}</span>
          <span className="text-subtle">[</span>
          <span className="text-ansi-green">
            {"|".repeat(Math.round(pct / 4)).padEnd(25, " ")}
          </span>
          <span className="text-subtle">]</span>
          <span className="text-muted">{pct}%</span>
        </p>
      ))}
    </div>
  );
}

export function TopTable({ fancy }: { fancy: boolean }) {
  return (
    <div
      role="presentation"
      onClick={() => store.dispatch({ type: "set-overlay", overlay: null })}
      className="absolute inset-0 z-20 overflow-auto bg-window p-4 font-mono text-xs sm:text-sm"
    >
      {fancy ? (
        <Bars />
      ) : (
        <p className="mb-3 text-muted">
          top - up forever, 1 user, load average: 0.00, 0.00, 0.00
        </p>
      )}
      <div className="space-y-0.5">
        {PROCS.map((row, i) => (
          <p key={i} className={i === 0 ? "font-bold text-accent" : "text-fg"}>
            <span className="inline-block w-12">{row[0]}</span>
            <span className="inline-block w-24">{row[1]}</span>
            <span className="inline-block w-12">{row[2]}</span>
            <span className="inline-block w-16">{row[3]}</span>
            <span>{row[4]}</span>
          </p>
        ))}
      </div>
      <p className="mt-4 text-muted">q (or any key) to quit</p>
    </div>
  );
}
