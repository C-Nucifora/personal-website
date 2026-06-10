import { describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { renderHook } from "@testing-library/react";
import { useTerminalKeys } from "./useTerminalKeys";

function setup(activeWindow: number, onHome = vi.fn()) {
  const inputRef = createRef<HTMLInputElement>();
  const bodyRef = createRef<HTMLDivElement>();
  renderHook(() =>
    useTerminalKeys({
      inputRef,
      bodyRef,
      onClear: vi.fn(),
      onHelp: vi.fn(),
      onCycleTheme: vi.fn(),
      onPalette: vi.fn(),
      onSelectWindow: vi.fn(),
      onNextWindow: vi.fn(),
      onPrevWindow: vi.fn(),
      onWindowSwitcher: vi.fn(),
      onHome,
      getActiveWindow: () => activeWindow,
    }),
  );
  return { onHome };
}

describe("useTerminalKeys Escape", () => {
  it("returns home when a section is active", () => {
    const { onHome } = setup(3);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onHome).toHaveBeenCalled();
  });
  it("does not go home when already in the shell", () => {
    const { onHome } = setup(0);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onHome).not.toHaveBeenCalled();
  });
});
