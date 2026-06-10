import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SectionNav } from "./SectionNav";

describe("SectionNav", () => {
  it("runs a section command when its button is clicked", () => {
    const onRun = vi.fn();
    render(<SectionNav onRun={onRun} />);
    fireEvent.click(screen.getByRole("button", { name: "projects" }));
    expect(onRun).toHaveBeenCalledWith("projects");
  });

  it("includes a help button that runs help", () => {
    const onRun = vi.fn();
    render(<SectionNav onRun={onRun} />);
    fireEvent.click(screen.getByRole("button", { name: "help" }));
    expect(onRun).toHaveBeenCalledWith("help");
  });

  it("renders exactly the four nav sections plus help", () => {
    render(<SectionNav onRun={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });
});
