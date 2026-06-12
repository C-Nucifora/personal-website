import { beforeAll, describe, expect, test } from "vitest";
import { createWebService, type WebService } from "./service";

const CSS = `:root {\n  --accent: #7aa2f7;\n}\n.button {\n  color: var(--accent);\n  displai: block;\n}\n`;
const JSON_BAD = `{\n  "name": "x",\n}\n`;
const HTML = `<!doctype html>\n<main><span>hi</span></main>\n`;

let svc: WebService;

beforeAll(() => {
  svc = createWebService({
    "styles/site.css": CSS,
    "config/bad.json": JSON_BAD,
    "pages/index.html": HTML,
  });
});

describe("web intelligence service (json/css/html)", () => {
  test("css hover describes the property", () => {
    const offset = CSS.indexOf("color:");
    const h = svc.hover("styles/site.css", offset);
    expect(h?.text.toLowerCase()).toContain("color");
  });

  test("css diagnostics flag the typoed property", () => {
    const diags = svc.diagnostics("styles/site.css");
    expect(diags.some((d) => d.message.toLowerCase().includes("displai"))).toBe(true);
  });

  test("css definition resolves the custom property within the file", () => {
    const usage = CSS.indexOf("--accent)");
    const d = svc.definition("styles/site.css", usage);
    expect(d?.path).toBe("styles/site.css");
    expect(CSS.slice(d!.offset, d!.offset + 8)).toBe("--accent");
  });

  test("css symbols include the selector", () => {
    const syms = svc.symbols("styles/site.css");
    expect(syms.some((s) => s.name === ".button")).toBe(true);
  });

  test("json diagnostics catch the trailing comma", () => {
    expect(svc.diagnostics("config/bad.json").length).toBeGreaterThan(0);
  });

  test("json symbols list properties", () => {
    expect(svc.symbols("config/bad.json").some((s) => s.name === "name")).toBe(true);
  });

  test("html hover describes the element", () => {
    const offset = HTML.indexOf("<span") + 2;
    const h = svc.hover("pages/index.html", offset);
    expect(h?.text.toLowerCase()).toContain("span");
  });

  test("unknown files are silent", () => {
    expect(svc.hover("nope.css", 0)).toBeNull();
    expect(svc.diagnostics("nope.json")).toEqual([]);
    expect(svc.symbols("nope.html")).toEqual([]);
  });
});
