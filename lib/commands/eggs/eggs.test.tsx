import { beforeEach, describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { activePane } from "@/lib/terminal/reducer";
import { store } from "@/lib/terminal/store";
import { executeCommand } from "@/lib/terminal/executor";

/** Run a line, return the rendered text of its output (EASTER_EGGS §1). */
function out(line: string): string {
  executeCommand(line, { source: "typed" });
  const sb = activePane(store.getState()).scrollback;
  const node = sb[sb.length - 1]?.node;
  if (node == null) return "";
  if (typeof node === "string") return node;
  const { container, unmount } = render(<>{node}</>);
  const text = container.textContent ?? "";
  unmount();
  return text;
}

beforeEach(() => {
  store.reset(null);
});

describe("sudo", () => {
  test("default refusal", () => {
    expect(out("sudo apt install joy")).toContain(
      "christian is not in the sudoers file. This incident will be reported.",
    );
  });
  test("make me a sandwich", () => {
    expect(out("sudo make me a sandwich")).toBe("Okay.");
  });
  test("sudo hire christian succeeds with the contact block", () => {
    expect(out("sudo hire christian")).toContain("cgnucifora@proton.me");
  });
});

describe("rm", () => {
  test("content files are protected", () => {
    executeCommand("cd ~/resume", { source: "typed" });
    expect(out("rm resume.pdf")).toContain(
      "rm: cannot remove 'resume.pdf': Protected by recruiters union",
    );
  });
  test("rm -rf / hits the authentic failsafe", () => {
    const text = out("rm -rf /");
    expect(text).toContain("rm: it is dangerous to operate recursively on '/'");
    expect(text).toContain("rm: use --no-preserve-root to override this failsafe");
  });
  test("missing files get the real errno", () => {
    expect(out("rm ghost.txt")).toContain(
      "rm: cannot remove 'ghost.txt': No such file or directory",
    );
  });
});

describe("editors and one-liners", () => {
  test("emacs", () => {
    expect(out("emacs")).toContain("command not found (this is a vim household)");
  });
  test("nano", () => {
    expect(out("nano")).toContain("bold of you to ask");
  });
  test("ping", () => {
    expect(out("ping")).toContain("pong");
    expect(out("ping")).toContain("time=0.042 ms");
  });
  test("make coffee", () => {
    expect(out("make coffee")).toContain("make: *** No rule to make target 'coffee'.  Stop.");
  });
  test("exit", () => {
    expect(out("exit")).toContain("there is no escape");
  });
});

describe("man", () => {
  test("man christian is a formatted man page", () => {
    const text = out("man christian");
    expect(text).toContain("NAME");
    expect(text).toContain("SYNOPSIS");
    expect(text).toContain("KNOWN BUGS");
    expect(text).toContain("occasionally refactors things that were fine");
    expect(text).toContain("contact(1)");
  });
  test("other pages point at christian", () => {
    expect(out("man ls")).toContain("No manual entry for ls (try: man christian)");
  });
});

describe("git", () => {
  test("outside a project dir: not a repository", () => {
    expect(out("git log")).toContain(
      "fatal: not a git repository (or any of the parent directories): .git",
    );
  });
  test("git blame confesses", () => {
    executeCommand("cd ~/projects/terminal-portfolio", { source: "typed" });
    expect(out("git blame README.md")).toContain("it was me. it's always me.");
  });
  test("git push --force is denied", () => {
    expect(out("git push --force")).toContain("denied: not on main. not ever.");
  });
});

describe("fake coreutils (§1.1)", () => {
  test("fortune prints something from the list", () => {
    expect(out("fortune").length).toBeGreaterThan(10);
  });
  test("cowsay says the text", () => {
    const text = out("cowsay hello there");
    expect(text).toContain("hello there");
    expect(text).toContain("(oo)");
  });
  test("figlet caps and renders block letters", () => {
    const text = out("figlet hi");
    expect(text).toContain("█");
  });
  test("uname -a", () => {
    const text = out("uname -a");
    expect(text).toContain("PortfolioOS christian 1.0.0-custom");
    expect(text).toContain("GNU/TypeScript");
  });
  test("uptime jokes about being static", () => {
    expect(out("uptime")).toContain("load average: 0.00, 0.00, 0.00 (it's a static site)");
  });
  test("df -h mounts coffee", () => {
    const text = out("df -h");
    expect(text).toContain("/dev/coffee");
    expect(text).toContain("98%");
  });
  test("free -h refuses swap", () => {
    expect(out("free -h")).toContain("0B (we don't do that here)");
  });
  test("which resolves known commands", () => {
    expect(out("which ls")).toContain("/usr/bin/ls");
  });
  test("which christian is hopeful", () => {
    expect(out("which christian")).toContain("/usr/bin/hired (hopefully)");
  });
  test("which unknown", () => {
    expect(out("which frob")).toContain("frob not found");
  });
  test("touch and mkdir hit the read-only fs", () => {
    expect(out("touch x")).toContain("touch: cannot touch 'x': Read-only file system");
    expect(out("mkdir y")).toContain("mkdir: cannot create directory 'y': Read-only file system");
  });
});

describe("top/htop", () => {
  test("top shows the process table overlay", () => {
    executeCommand("top", { source: "typed" });
    expect(store.getState().overlay).toBe("top");
  });
  test("htop gets the fancy variant", () => {
    executeCommand("htop", { source: "typed" });
    expect(store.getState().overlay).toBe("htop");
  });
});
