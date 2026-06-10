import { beforeEach, describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { profile } from "@/data/profile";
import { getPane } from "./reducer";
import { store } from "./store";
import { executeCommand } from "./executor";
import { registerThemeEnv } from "./env";

function scrollback(windowKey: "lobby" | "about" | "projects" = "lobby") {
  return windowKey === "lobby"
    ? store.getState().lobby.panes[0].scrollback
    : getPane(store.getState(), windowKey).scrollback;
}

function renderLast(windowKey?: "lobby" | "about" | "projects") {
  const sb = scrollback(windowKey);
  return render(<>{sb[sb.length - 1].node}</>);
}

beforeEach(() => {
  store.reset(null);
});

describe("echo + output shape", () => {
  test("a command echoes first, output follows as its own line", () => {
    executeCommand("pwd", { source: "typed" });
    const sb = scrollback();
    expect(sb).toHaveLength(2);
    expect(sb[0].command).toBe("pwd");
    expect(sb[0].node).toBe(null);
    renderLast();
    expect(screen.getByText("~")).toBeTruthy();
  });

  test("empty input is a no-op", () => {
    executeCommand("   ", { source: "typed" });
    expect(scrollback()).toHaveLength(0);
  });
});

describe("unknown commands (FLOW §9)", () => {
  test("unknown command fails politely", () => {
    executeCommand("frobnicate", { source: "typed" });
    renderLast();
    expect(screen.getByText(/command not found: frobnicate/)).toBeTruthy();
  });

  test("bare section word suggests cd, clickably", () => {
    executeCommand("about", { source: "typed" });
    renderLast();
    expect(screen.getByText(/command not found: about/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "cd ~/about" }));
    expect(store.getState().activeWindow).toBe("about");
  });

  test("the suggestion works from a deep cwd in another window", () => {
    executeCommand("cd ~/projects", { source: "typed" });
    executeCommand("resume", { source: "typed" });
    renderLast("projects");
    fireEvent.click(screen.getByRole("button", { name: "cd ~/resume" }));
    expect(store.getState().activeWindow).toBe("resume");
  });

  test("levenshtein-1 typo gets a did-you-mean", () => {
    executeCommand("pdw", { source: "typed" });
    const { container } = renderLast();
    expect(container.textContent).toMatch(/did you mean 'pwd'\?/);
    fireEvent.click(screen.getByRole("button", { name: "pwd" }));
    expect(scrollback().some((l) => l.command === "pwd")).toBe(true);
  });
});

describe("history", () => {
  test("executed commands append to history", () => {
    executeCommand("pwd", { source: "typed" });
    expect(store.getState().history).toEqual(["vim resume.md", "pwd"]);
  });

  test("!{n} re-runs the numbered entry", () => {
    executeCommand("pwd", { source: "typed" });
    executeCommand("!2", { source: "typed" });
    const sb = scrollback();
    expect(sb[sb.length - 2].command).toBe("pwd");
  });

  test("history prints numbered entries", () => {
    executeCommand("history", { source: "typed" });
    renderLast();
    expect(screen.getByText(/vim resume\.md/)).toBeTruthy();
  });
});

describe("cd (FLOW §2.1)", () => {
  test("cd into a window switches and auto-displays once", () => {
    executeCommand("cd ~/about", { source: "typed" });
    expect(store.getState().activeWindow).toBe("about");
    expect(store.getState().windows.about.visited).toBe(true);
    const sb = scrollback("about");
    expect(sb.some((l) => l.command === "cat about.md")).toBe(true);
  });

  test("projects auto-displays with ls", () => {
    executeCommand("cd projects", { source: "typed" });
    expect(scrollback("projects").some((l) => l.command === "ls")).toBe(true);
  });

  test("second entry does not re-run the auto command", () => {
    executeCommand("cd ~/about", { source: "typed" });
    const count = scrollback("about").filter((l) => l.command === "cat about.md").length;
    executeCommand("cd ~", { source: "typed" });
    executeCommand("cd ~/about", { source: "typed" });
    expect(
      scrollback("about").filter((l) => l.command === "cat about.md").length,
    ).toBe(count);
  });

  test("cd to a missing path errors authentically", () => {
    executeCommand("cd ~/nope", { source: "typed" });
    renderLast();
    expect(screen.getByText(/cd: no such file or directory: ~\/nope/)).toBeTruthy();
    expect(store.getState().activeWindow).toBe(null);
  });

  test("cd - returns to the previous directory", () => {
    executeCommand("cd ~/projects", { source: "typed" });
    executeCommand("cd ~", { source: "typed" });
    executeCommand("cd -", { source: "typed" });
    expect(getPane(store.getState(), "projects").cwd).toBe("~/projects");
  });
});

describe("cat", () => {
  test("cat about.md renders the about content", () => {
    executeCommand("cd ~/about", { source: "typed" });
    executeCommand("cat about.md", { source: "typed" });
    renderLast("about");
    expect(screen.getAllByText(new RegExp(profile.name)).length).toBeGreaterThan(0);
  });

  test("cat on a missing file errors", () => {
    executeCommand("cat nope.md", { source: "typed" });
    renderLast();
    expect(screen.getByText(/cat: no such file or directory: nope.md/)).toBeTruthy();
  });

  test("cat on a directory errors", () => {
    executeCommand("cat ~/about", { source: "typed" });
    renderLast();
    expect(screen.getByText(/cat: ~\/about: Is a directory/)).toBeTruthy();
  });
});

describe("ls", () => {
  test("lists the five window dirs in the lobby, clickably", () => {
    executeCommand("ls", { source: "typed" });
    renderLast();
    fireEvent.click(screen.getByRole("button", { name: "projects/" }));
    expect(store.getState().activeWindow).toBe("projects");
  });

  test("hides dotfiles unless -a", () => {
    executeCommand("ls", { source: "typed" });
    renderLast();
    expect(screen.queryByText(/\.plan/)).toBe(null);
    executeCommand("ls -a", { source: "typed" });
    renderLast();
    expect(screen.getByText(/\.plan/)).toBeTruthy();
  });

  test("ls on a missing path errors", () => {
    executeCommand("ls ~/nope", { source: "typed" });
    renderLast();
    expect(screen.getByText(/ls: no such file or directory: ~\/nope/)).toBeTruthy();
  });
});

describe("session commands", () => {
  test("clear empties the pane scrollback", () => {
    executeCommand("pwd", { source: "typed" });
    executeCommand("clear", { source: "typed" });
    expect(scrollback()).toHaveLength(0);
  });

  test("echo prints its arguments", () => {
    executeCommand("echo hello world", { source: "typed" });
    renderLast();
    expect(screen.getByText("hello world")).toBeTruthy();
  });

  test("help ends with the clickable full guide", () => {
    executeCommand("help", { source: "typed" });
    renderLast();
    fireEvent.click(screen.getByRole("button", { name: /cd ~\/help/ }));
    expect(store.getState().activeWindow).toBe("help");
  });

  test("open asks for confirmation instead of opening", () => {
    executeCommand("open https://example.com", { source: "typed" });
    expect(store.getState().pendingConfirm).toEqual({
      kind: "openUrl",
      payload: "https://example.com",
    });
  });
});

describe("theme", () => {
  test("theme <name> goes through the theme env", () => {
    let current = "tokyo-night";
    registerThemeEnv({
      getThemeId: () => current,
      setTheme: (id) => {
        current = id;
        return true;
      },
    });
    executeCommand("theme dracula", { source: "typed" });
    expect(current).toBe("dracula");
  });
});
