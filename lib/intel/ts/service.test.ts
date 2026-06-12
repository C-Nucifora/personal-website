import { beforeAll, describe, expect, test } from "vitest";
import { createTsService, type TsService } from "./service";
import libs from "@/data/generated/ts-libs.json";

const A = `export function greet(name: string): string {\n  return "hi " + name;\n}\n`;
const B = `import { greet } from "./a";\nexport const msg: number = greet("x");\n`;

let svc: TsService;

beforeAll(() => {
  svc = createTsService({
    files: { "src/a.ts": A, "src/b.ts": B },
    libs: libs as Record<string, string>,
  });
});

describe("TS intelligence service", () => {
  test("hover reports the resolved signature", () => {
    const offset = B.indexOf("greet(") + 1;
    // Imported symbols hover as "(alias) greet(...)" — the resolved
    // signature is what matters.
    const h = svc.hover("src/b.ts", offset);
    expect(h?.text).toContain("greet(name: string): string");
  });

  test("cross-file definition lands in the defining file", () => {
    const offset = B.indexOf("greet(") + 1;
    const d = svc.definition("src/b.ts", offset);
    expect(d?.path).toBe("src/a.ts");
    expect(A.slice(d!.offset, d!.offset + 5)).toBe("greet");
  });

  test("diagnostics flag the deliberate type error and resolve the import", () => {
    const diags = svc.diagnostics("src/b.ts");
    expect(diags.some((d) => d.message.includes("not assignable"))).toBe(true);
    expect(diags.some((d) => d.message.includes("Cannot find module"))).toBe(false);
  });

  test("symbols outline includes the exported function", () => {
    const syms = svc.symbols("src/a.ts");
    expect(syms.some((s) => s.name === "greet" && s.line === 1)).toBe(true);
  });

  test("hover on whitespace is null, unknown file is empty", () => {
    expect(svc.hover("src/b.ts", B.indexOf("\n"))).toBeNull();
    expect(svc.diagnostics("src/missing.ts")).toEqual([]);
  });
});
