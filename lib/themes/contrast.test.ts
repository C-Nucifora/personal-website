import { describe, expect, test } from "vitest";
import { themes } from "./index";

function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map((value) => parseInt(value, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

describe("theme text contrast", () => {
  for (const { id, theme } of themes) {
    test(`${id} text meets WCAG AA on each reading surface`, () => {
      for (const key of ["--fg", "--fg-muted", "--accent", "--success", "--warning", "--error", "--info", "--ansi-red", "--ansi-green", "--ansi-yellow", "--ansi-blue", "--ansi-magenta", "--ansi-cyan"] as const) {
        for (const surface of ["--bg", "--bg-window", "--bg-elevated"] as const) {
          const [low, high] = [luminance(theme[key]), luminance(theme[surface])].sort((a, b) => a - b);
          expect((high + 0.05) / (low + 0.05), `${key} on ${surface}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }
});
