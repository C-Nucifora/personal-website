"use client";

/** No-JS target is main; the terminal target is its active reading pane. */
export function SkipLink() {
  return <a href="#main" className="skip-link" onClick={(event) => {
    if (document.documentElement.dataset.jsReady !== "true" || document.documentElement.dataset.view === "plain") return;
    const pane = document.querySelector<HTMLElement>('[data-window]:not([aria-hidden="true"]) [data-pane-scroll]');
    if (pane) { event.preventDefault(); pane.focus(); }
  }}>Skip to content</a>;
}
