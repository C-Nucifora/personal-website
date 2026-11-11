"use client";

import { profile } from "@/data/profile";
import { useEffect, useRef } from "react";
import { TitleBar } from "./TitleBar";
import { TabBar } from "./TabBar";
import { WelcomeStrip } from "./WelcomeStrip";
import { WindowArea } from "./WindowArea";
import { WindowPicker } from "./WindowPicker";
import { StatusBar } from "./StatusBar";
import { seedMotd } from "./Motd";
import { useTheme } from "@/components/theme/ThemeProvider";
import { CrtOverlay } from "@/components/effects/CrtOverlay";
import { Disintegration } from "@/components/effects/Disintegration";
import { MatrixRain } from "@/components/effects/MatrixRain";
import { store } from "@/lib/terminal/store";
import { executeCommand } from "@/lib/terminal/executor";
import { focusActivePrompt } from "@/lib/terminal/focus";
import { loadProjectSources } from "@/lib/vfs/project-sources";
import { initIdle } from "@/lib/terminal/idle";
import { initKeyboard } from "@/lib/terminal/keyboard";
import { initRouting } from "@/lib/terminal/routing";
import { registerThemeEnv } from "@/lib/terminal/env";
import { applyViewMode, initialViewMode } from "@/lib/view-mode";
import { useTerminalStore } from "@/lib/terminal/useTerminalStore";
import type { WindowId } from "@/lib/terminal/types";

/**
 * The terminal shell — a thin layout over the store (FLOW.md §1). All state
 * lives in lib/terminal; this component boots the session and renders chrome.
 */
export function Terminal({ initialWindow = null }: { initialWindow?: WindowId | null }) {
  const { themeId, setTheme } = useTheme();

  // Bridge the theme context to the non-React executor.
  const themeIdRef = useRef(themeId);
  useEffect(() => {
    themeIdRef.current = themeId;
  }, [themeId]);
  useEffect(() => {
    registerThemeEnv({ getThemeId: () => themeIdRef.current, setTheme });
  }, [setTheme]);

  // Boot once: MOTD in the landing shell, deep links arrive "as if typed"
  // (FLOW §4), then the global listeners. If hydration fails this never runs
  // and the server-rendered fallback stays visible.
  useEffect(() => {
    // Resolve plain view before revealing the terminal, so a ?plain=1
    // visitor never sees a flash of terminal chrome.
    applyViewMode(initialViewMode(window.location.search));
    document.documentElement.setAttribute("data-js-ready", "true");

    store.reset(initialWindow);
    try {
      if (localStorage.getItem("portfolio:crt-unlocked") === "1") {
        store.dispatch({ type: "unlock-crt" });
      }
    } catch {
      /* storage unavailable */
    }
    seedMotd(initialWindow ?? "lobby");
    if (initialWindow) {
      executeCommand(`cd ~/${initialWindow}`, { source: "auto", windowKey: initialWindow });
    }
    focusActivePrompt();

    // Fetch source only once someone explores projects, including deep links.
    let sourcesRequested = false;
    let sourcesFailed = false;
    const loadSources = () => {
      if (store.getState().activeWindow !== "projects") sourcesFailed = false;
      if (sourcesRequested || sourcesFailed || store.getState().activeWindow !== "projects" || document.documentElement.getAttribute("data-view") === "plain") return;
      sourcesRequested = true;
      loadProjectSources().then(disposeSources).catch(() => {
        sourcesRequested = false;
        sourcesFailed = true;
        store.dispatch({ type: "set-notice", text: "Source unavailable offline. Project summaries are still available.", until: Date.now() + 5000 });
      });
    };
    const disposeSources = store.subscribe(loadSources);
    loadSources();

    const disposeKeyboard = initKeyboard();
    const disposeRouting = initRouting();
    const disposeIdle = initIdle();
    return () => {
      disposeSources();
      disposeKeyboard();
      disposeRouting();
      disposeIdle();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overlay = useTerminalStore((s) => s.overlay);

  return (
    <div data-terminal-root className="relative flex h-dvh flex-col bg-window">
      <h1 className="sr-only">{profile.name}, portfolio</h1>
      <TitleBar />
      <TabBar />
      <WelcomeStrip />
      <WindowArea />
      <StatusBar />
      <WindowPicker />
      <CrtOverlay />
      {overlay === "disintegration" && <Disintegration />}
      {overlay === "matrix" && <MatrixRain />}
    </div>
  );
}
