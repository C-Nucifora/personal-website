"use client";

import { useEffect, useRef } from "react";
import { commandMetas } from "@/lib/commands";
import { GROUP_ORDER } from "@/lib/commands/types";
import { Icon } from "@/components/ui/Icon";

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  onRun: (command: string) => void;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

export function HelpPanel({ open, onClose, onRun }: HelpPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const nodes = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((el) => el.offsetParent !== null);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const showEverything = () => {
    ["about", "resume", "projects", "contact"].forEach((c) => onRun(c));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-panel-title"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-window shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border bg-elevated px-4 py-3">
          <h2 id="help-panel-title" className="font-mono text-sm font-semibold text-fg">
            How this site works
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="rounded p-1 text-muted transition-colors hover:text-accent focus-visible:outline-2"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          <p className="font-sans text-[15px] leading-relaxed text-fg">
            This portfolio works like a terminal — but you never have to type. Click the buttons and
            chips, and each one shows the command it ran so you learn as you go. Prefer typing? Every
            action has a command.
          </p>

          <button
            type="button"
            onClick={showEverything}
            className="w-full rounded-md border border-accent/40 px-3 py-2.5 text-sm text-accent transition-colors hover:bg-accent/10 focus-visible:outline-2"
          >
            Just show me everything →
          </button>

          <div className="space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-muted">Commands</h3>
            {GROUP_ORDER.map((group) => {
              const inGroup = commandMetas.filter((c) => c.group === group && !c.hidden);
              if (inGroup.length === 0) return null;
              return (
                <div key={group} className="space-y-2">
                  <p className="text-xs font-semibold text-accent">{group}</p>
                  <table className="w-full border-collapse text-left">
                    <tbody>
                      {inGroup.map((c) => (
                        <tr key={c.name} className="align-top">
                          <td className="py-1.5 pr-3">
                            <button
                              type="button"
                              onClick={() => {
                                onRun(c.name);
                                onClose();
                              }}
                              className="font-mono text-sm text-fg hover:text-accent hover:underline"
                            >
                              {c.name}
                            </button>
                          </td>
                          <td className="py-1.5 font-sans text-sm text-muted">
                            {c.description}
                            {c.aliases.length > 0 && (
                              <span className="mt-0.5 block font-mono text-xs text-subtle">
                                aliases: {c.aliases.join(", ")}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5 border-t border-border pt-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-muted">Keyboard</h3>
            <ul className="space-y-1 font-sans text-sm text-fg">
              <li>
                <span className="font-mono text-accent">Tab</span> — complete a command
              </li>
              <li>
                <span className="font-mono text-accent">↑ / ↓</span> — previous commands
              </li>
              <li>
                <span className="font-mono text-accent">clear</span> — reset the screen
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
