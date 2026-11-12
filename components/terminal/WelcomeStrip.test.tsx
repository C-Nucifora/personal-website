import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WELCOME_DISMISSED_KEY, WelcomeStrip } from "./WelcomeStrip";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem(WELCOME_DISMISSED_KEY);
});

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

  test("dismiss hides it for the current document when storage writes fail", async () => {
    const view = render(<WelcomeStrip />);
    const button = await screen.findByRole("button", { name: "Dismiss welcome message" });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    });

    fireEvent.click(button);

    expect(setItem).toHaveBeenCalledWith(WELCOME_DISMISSED_KEY, "1");
    expect(localStorage.getItem(WELCOME_DISMISSED_KEY)).toBeNull();
    expect(screen.queryByRole("note")).toBeNull();
    view.rerender(<WelcomeStrip />);
    expect(screen.queryByRole("note")).toBeNull();
  });

  test("stays hidden when storage reads are unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage access denied", "SecurityError");
    });

    render(<WelcomeStrip />);

    expect(screen.queryByRole("note")).toBeNull();
  });
});
