import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Fetch } from "./Fetch";
import { profile } from "@/data/profile";

describe("Fetch", () => {
  it("renders the identity rows and the supplied theme", () => {
    render(<Fetch themeId="tokyo-night" />);
    expect(screen.getByText("Host")).toBeInTheDocument();
    expect(screen.getByText("Shell")).toBeInTheDocument();
    expect(screen.getByText("tokyo-night")).toBeInTheDocument();
    expect(screen.getByText(profile.email)).toBeInTheDocument();
  });
});
