import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  commandModules,
  commandMetas,
  resolveCommand,
  completionCandidates,
  runCommandLine,
} from "./index";
import type { SessionActions } from "./index";

function makeActions(): SessionActions {
  return {
    clear: vi.fn(),
    run: vi.fn(),
    history: [],
    getThemeId: () => "tokyo-night",
    setTheme: vi.fn(() => true),
    openHelpPanel: vi.fn(),
    cwd: "~",
  };
}

beforeEach(() => {
  // Commands like homelab/copy/resume touch these; keep them harmless.
  vi.stubGlobal("open", vi.fn());
  vi.stubGlobal("print", vi.fn());
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(() => Promise.resolve()) },
    configurable: true,
  });
});

describe("command registry", () => {
  it("resolves every command by its name", () => {
    for (const m of commandModules) {
      expect(resolveCommand(m.meta.name)).toBe(m);
    }
  });
  it("resolves every alias", () => {
    for (const m of commandModules) {
      for (const a of m.meta.aliases) expect(resolveCommand(a)).toBe(m);
    }
  });
  it("exposes all names + aliases as completion candidates", () => {
    const cands = completionCandidates();
    for (const m of commandModules) {
      expect(cands).toContain(m.meta.name);
    }
  });
  it("renders every command without throwing", () => {
    for (const m of commandModules) {
      expect(() => m.run({ ...makeActions(), args: [], raw: m.meta.name, commands: commandMetas })).not.toThrow();
    }
  });
  it("returns a friendly result for an unknown command", () => {
    const { resolved } = runCommandLine("definitelynotacommand", makeActions());
    expect(resolved).toBeNull();
  });
  it("resolves a known command line", () => {
    const { resolved } = runCommandLine("projects", makeActions());
    expect(resolved).toBe("projects");
  });
});
