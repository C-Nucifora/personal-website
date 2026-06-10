"use client";

import { useEffect, useRef } from "react";
import { TitleBar } from "./TitleBar";
import { TabBar } from "./TabBar";
import { WindowArea } from "./WindowArea";
import { WindowPicker } from "./WindowPicker";
import { StatusBar } from "./StatusBar";
import { seedMotd } from "./Motd";
import { useTheme } from "@/components/theme/ThemeProvider";
import { store } from "@/lib/terminal/store";
import { executeCommand } from "@/lib/terminal/executor";
import { initKeyboard } from "@/lib/terminal/keyboard";
import { initRouting } from "@/lib/terminal/routing";
import { registerThemeEnv } from "@/lib/terminal/env";
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
    document.documentElement.setAttribute("data-js-ready", "true");

    store.reset(initialWindow);
    seedMotd(initialWindow ?? "lobby");
    if (initialWindow) {
      executeCommand(`cd ~/${initialWindow}`, { source: "auto", windowKey: initialWindow });
    }

    const disposeKeyboard = initKeyboard();
    const disposeRouting = initRouting();
    return () => {
      disposeKeyboard();
      disposeRouting();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex h-dvh flex-col bg-window">
      <TitleBar />
      <TabBar />
      <WindowArea />
      <StatusBar />
      <WindowPicker />
    </div>
  );
}
