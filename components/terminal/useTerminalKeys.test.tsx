import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTerminalKeys } from "./useTerminalKeys";

describe("useTerminalKeys", () => {
  it("Ctrl-L clears the log", () => {
    const onClear = vi.fn();
    renderHook(() => useTerminalKeys({ onClear }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "l", ctrlKey: true }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("Cmd-L clears the log", () => {
    const onClear = vi.fn();
    renderHook(() => useTerminalKeys({ onClear }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "l", metaKey: true }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("ignores a plain 'l' keypress", () => {
    const onClear = vi.fn();
    renderHook(() => useTerminalKeys({ onClear }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "l" }));
    expect(onClear).not.toHaveBeenCalled();
  });
});
