import { themes, DEFAULT_THEME_ID, THEME_STORAGE_KEY, themeToCssVariables } from "./index";

/**
 * Builds the inline script that runs in <head> before first paint. Two jobs:
 *
 * 1. Read the saved theme (or fall back to prefers-color-scheme on the first
 *    visit) and write its tokens onto :root so there is never a flash of the
 *    wrong colours.
 * 2. Register the page's FIRST popstate listener. While the terminal owns
 *    history (window.__terminalHistory, set by lib/terminal/routing.ts), it
 *    stops the event before Next's router sees it — Next would otherwise
 *    fetch the route's RSC payload and remount (or full-reload on failure) —
 *    and re-emits it as "terminal:popstate" for the terminal to handle as a
 *    plain window switch. Being inlined ahead of hydration is what
 *    guarantees first place in listener order.
 *
 * Kept tiny and dependency-free; values are baked in at build.
 */
export function themeInitScript(): string {
  const cssById: Record<string, string> = {};
  for (const t of themes) cssById[t.id] = themeToCssVariables(t.theme);

  const firstDark = themes.find((t) => t.appearance === "dark")?.id ?? DEFAULT_THEME_ID;
  const firstLight = themes.find((t) => t.appearance === "light")?.id ?? DEFAULT_THEME_ID;

  // JSON.stringify keeps this safe to inline; no user input is involved.
  return `(function(){try{
var KEY=${JSON.stringify(THEME_STORAGE_KEY)};
var CSS=${JSON.stringify(cssById)};
var DARK=${JSON.stringify(firstDark)};
var LIGHT=${JSON.stringify(firstLight)};
var saved=null;try{saved=localStorage.getItem(KEY);}catch(e){}
var id=(saved&&CSS[saved])?saved:null;
if(!id){var pl=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches;id=pl?LIGHT:DARK;}
var root=document.documentElement;
root.setAttribute("data-theme",id);
root.style.cssText+=";"+CSS[id];
}catch(e){}
window.addEventListener("popstate",function(e){
if(window.__terminalHistory){e.stopImmediatePropagation();window.dispatchEvent(new Event("terminal:popstate"));}
});})();`;
}
