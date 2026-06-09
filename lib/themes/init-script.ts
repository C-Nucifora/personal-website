import { themes, DEFAULT_THEME_ID, THEME_STORAGE_KEY, themeToCssVariables } from "./index";

/**
 * Builds the inline script that runs in <head> before first paint. It reads
 * the saved theme (or falls back to prefers-color-scheme on the first visit),
 * then writes that theme's tokens onto :root so there is never a flash of the
 * wrong colours. Kept tiny and dependency-free; values are baked in at build.
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
}catch(e){}})();`;
}
