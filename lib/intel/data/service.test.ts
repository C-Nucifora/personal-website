import { beforeAll, describe, expect, test } from "vitest";
import { createDataService, type DataService } from "./service";

const YAML_BAD = `name: ci\non: [push\njobs:\n  build:\n    runs-on: ubuntu-latest\n`;
const YAML_GOOD = `name: deploy\njobs:\n  verify:\n    steps: []\n`;
const TOML_BAD = `[package\nname = "demo"\n`;
const TOML_GOOD = `[package]\nname = "demo"\n\n[dependencies]\nserde = "1"\n`;

let svc: DataService;

beforeAll(() => {
  svc = createDataService({
    "ci-bad.yml": YAML_BAD,
    "ci.yml": YAML_GOOD,
    "Cargo-bad.toml": TOML_BAD,
    "Cargo.toml": TOML_GOOD,
  });
});

describe("data intelligence service (yaml/toml)", () => {
  test("yaml diagnostics catch the unclosed flow sequence", () => {
    const diags = svc.diagnostics("ci-bad.yml");
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].severity).toBe("error");
  });

  test("clean yaml has no diagnostics and lists top-level keys", () => {
    expect(svc.diagnostics("ci.yml")).toEqual([]);
    const names = svc.symbols("ci.yml").map((s) => s.name);
    expect(names).toContain("name");
    expect(names).toContain("jobs");
  });

  test("toml diagnostics catch the broken table header", () => {
    expect(svc.diagnostics("Cargo-bad.toml").length).toBeGreaterThan(0);
  });

  test("clean toml lists tables and keys", () => {
    expect(svc.diagnostics("Cargo.toml")).toEqual([]);
    const names = svc.symbols("Cargo.toml").map((s) => s.name);
    expect(names).toContain("package");
    expect(names).toContain("dependencies");
  });

  test("hover and definition stay silent (tier-3 lite)", () => {
    expect(svc.hover("ci.yml", 0)).toBeNull();
    expect(svc.definition("Cargo.toml", 0)).toBeNull();
  });

  test("unknown files are silent", () => {
    expect(svc.diagnostics("nope.yml")).toEqual([]);
    expect(svc.symbols("nope.toml")).toEqual([]);
  });
});
