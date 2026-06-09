/**
 * Persist the command history (for ↑/↓ recall) across sessions, mirroring the
 * theme persistence pattern. Only the typed command *lines* are stored — never
 * the rendered output — so a fresh session still opens to a clean log.
 */
const HISTORY_STORAGE_KEY = "portfolio:history";
const HISTORY_MAX = 100;

export function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string").slice(-HISTORY_MAX);
    }
  } catch {
    /* storage unavailable or malformed — start empty */
  }
  return [];
}

export function saveHistory(history: string[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(-HISTORY_MAX)));
  } catch {
    /* storage may be unavailable (private mode) */
  }
}

export { HISTORY_MAX };
