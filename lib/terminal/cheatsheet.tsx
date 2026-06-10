/**
 * Ctrl+b ? prints the binding cheatsheet into the active pane (FLOW §7.2).
 * Keybinding-triggered, so no command echo.
 */
import { activeWindowKey } from "./reducer";
import { store } from "./store";

const ROWS: [string, string][] = [
  ["Ctrl+b 1-5", "jump to window"],
  ["Ctrl+b n / p", "next / previous window"],
  ["Ctrl+b w", "window picker"],
  ["Ctrl+b [", "COPY mode (j k, Ctrl+d/u, gg G, q to leave)"],
  ["Ctrl+b %", "split pane left|right (projects)"],
  ['Ctrl+b "', "split pane top/bottom (projects)"],
  ["Ctrl+b o / h j k l", "move between panes"],
  ["Ctrl+b z", "zoom pane"],
  ["Ctrl+b x", "close pane (y/n)"],
  ["Ctrl+b t", "clock"],
  ["Esc", "NORMAL mode on the command line"],
  ["Ctrl+b ?", "this list"],
];

export function printBindingCheatsheet(): void {
  store.dispatch({
    type: "append-line",
    windowKey: activeWindowKey(store.getState()),
    command: null,
    node: (
      <div className="space-y-1 font-mono text-sm">
        {ROWS.map(([keys, what]) => (
          <p key={keys}>
            <span className="inline-block w-48 text-accent">{keys}</span>
            <span className="text-fg">{what}</span>
          </p>
        ))}
      </div>
    ),
  });
}
