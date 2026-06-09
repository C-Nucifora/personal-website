"use client";

import { Icon } from "@/components/ui/Icon";

/** Opens the browser print dialog; the @media print CSS yields a clean resume. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-md border border-accent/40 px-3 py-2 text-sm text-accent transition-colors hover:bg-accent/10"
    >
      <Icon name="printer" size={16} />
      Print / Save as PDF
    </button>
  );
}
