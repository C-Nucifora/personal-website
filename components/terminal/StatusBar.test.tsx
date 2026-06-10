import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBar } from "./StatusBar";

describe("StatusBar", () => {
  it("renders the resolved theme label and is non-interactive", () => {
    const { container } = render(<StatusBar themeId="dracula" />);
    expect(screen.getByText("Dracula")).toBeInTheDocument();
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("falls back to the raw id for an unknown theme", () => {
    render(<StatusBar themeId="not-a-theme" />);
    expect(screen.getByText("not-a-theme")).toBeInTheDocument();
  });
});
