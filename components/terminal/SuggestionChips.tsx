"use client";

import { Chip } from "@/components/ui/Chip";

const DEFAULT_SUGGESTIONS = ["about", "projects", "resume", "contact", "help"];

/** The most common next moves, as clickable chips under the greeting. */
export function SuggestionChips({
  onRun,
  items = DEFAULT_SUGGESTIONS,
  label = "Suggestions",
}: {
  onRun: (command: string) => void;
  items?: string[];
  label?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {items.map((item) => (
        <Chip key={item} label={item} accent onClick={() => onRun(item)} />
      ))}
    </div>
  );
}
