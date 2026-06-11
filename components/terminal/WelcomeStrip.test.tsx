import { afterEach, describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WELCOME_DISMISSED_KEY, WelcomeStrip } from "./WelcomeStrip";

afterEach(() => localStorage.removeItem(WELCOME_DISMISSED_KEY));

describe("WelcomeStrip", () => {
  test("shows on first visit", async () => {
    render(<WelcomeStrip />);
    expect(await screen.findByRole("note", { name: "Welcome" })).toBeInTheDocument();
  });

  test("dismiss hides it and persists", async () => {
    render(<WelcomeStrip />);
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss welcome message" }));
    expect(screen.queryByRole("note")).toBeNull();
    expect(localStorage.getItem(WELCOME_DISMISSED_KEY)).toBe("1");
  });

  test("stays hidden once dismissed", () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, "1");
    render(<WelcomeStrip />);
    expect(screen.queryByRole("note")).toBeNull();
  });
});
