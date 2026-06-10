/**
 * A real "last login" line: read the previous visit from localStorage, record
 * the current visit, and return the formatted line. Call once per page load.
 */
const KEY = "portfolio:lastLogin";

function fmt(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function readAndRecordLastLogin(): string {
  let prev: string | null = null;
  try {
    prev = localStorage.getItem(KEY);
    localStorage.setItem(KEY, new Date().toISOString());
  } catch {
    /* storage unavailable (private mode) — fall back to now */
  }
  const when = prev ? new Date(prev) : new Date();
  return `last login: ${fmt(when)} on ttys001`;
}
