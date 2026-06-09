import type { ReactNode } from "react";

/** Plain output line. */
export function Line({ children }: { children: ReactNode }) {
  return <p className="text-fg">{children}</p>;
}

/** A success line (e.g. theme changed). */
export function OkLine({ children }: { children: ReactNode }) {
  return <p className="text-success">{children}</p>;
}

/** A friendly error / not-found line. Guides, never scolds. */
export function ErrorLine({ children }: { children: ReactNode }) {
  return <p className="text-error">{children}</p>;
}

/** A muted hint. */
export function Hint({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

/** A labelled output block with a comment-style heading. */
export function OutputBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-xs uppercase tracking-wider text-muted">{`// ${label}`}</p>
      {children}
    </div>
  );
}
