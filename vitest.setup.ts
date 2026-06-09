import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";

// Node.js 26 defines globalThis.localStorage as an experimental feature that
// returns undefined unless --localstorage-file is passed. Vitest's jsdom
// environment skips overriding it because localStorage is already "in global".
// Polyfill: copy jsdom's actual Storage object onto globalThis so that bare
// `localStorage` works in tests exactly as it would in a browser.
beforeAll(() => {
  type JsdomGlobal = { jsdom?: { window?: { _localStorage?: Storage } } };
  const dom = (globalThis as JsdomGlobal).jsdom;
  if (dom?.window?._localStorage && typeof localStorage === "undefined") {
    Object.defineProperty(globalThis, "localStorage", {
      value: dom.window._localStorage,
      writable: true,
      configurable: true,
    });
  }
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
