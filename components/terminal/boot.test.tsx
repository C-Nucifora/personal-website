import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BootHint, bootEntries } from "./boot";

describe("BootHint", () => {
  it("renders clickable hint words that run their command", () => {
    const onRun = vi.fn();
    render(<BootHint onRun={onRun} />);
    expect(screen.getByText("try:", { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "about" }));
    expect(onRun).toHaveBeenCalledWith("about");
  });
});

describe("bootEntries", () => {
  it("returns three non-null seed outputs", () => {
    const entries = bootEntries("tokyo-night", () => {});
    expect(entries).toHaveLength(3);
    expect(entries.every((e) => e.output != null)).toBe(true);
    expect(entries.every((e) => e.command === null)).toBe(true);
  });
});
