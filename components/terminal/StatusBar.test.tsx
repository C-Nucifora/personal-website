import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StatusBar } from "./StatusBar";

const noop = () => {};

describe("StatusBar", () => {
  it("marks the home control active at the shell and shows no 0:shell tab", () => {
    render(<StatusBar mode="insert" prefix={false} active={0} onSelect={noop} />);
    const home = screen.getByRole("button", { name: /home/i });
    expect(home).toHaveAttribute("data-home", "true");
    expect(home).toHaveAttribute("aria-current", "true");
    expect(screen.queryByText("0:shell")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /about/i })).toBeInTheDocument();
  });

  it("highlights a section and calls onSelect(0) when home is clicked", () => {
    const onSelect = vi.fn();
    render(<StatusBar mode="insert" prefix={false} active={3} onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: /home/i })).not.toHaveAttribute("aria-current");
    fireEvent.click(screen.getByRole("button", { name: /home/i }));
    expect(onSelect).toHaveBeenCalledWith(0);
  });
});
