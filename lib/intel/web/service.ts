/**
 * Tier-2 web-stack intelligence: JSON / CSS / HTML via the vscode language
 * services (pure JS, single-document analysis — spec 2026-06-12). Pure and
 * synchronous like the TS service; the worker shell wraps it. JSON runs
 * schemaless (syntax + structure only); HTML has no diagnostics by design
 * of the upstream service.
 */
import { getCSSLanguageService } from "vscode-css-languageservice";
import { getLanguageService as getHtmlLanguageService } from "vscode-html-languageservice";
import { getLanguageService as getJsonLanguageService } from "vscode-json-languageservice";
import { TextDocument } from "vscode-languageserver-textdocument";
import type {
  Diagnostic,
  Hover,
  Location,
  SymbolInformation,
} from "vscode-css-languageservice";
import type { IntelDefinition, IntelDiagnostic, IntelHover, IntelSymbol } from "../types";

export interface WebService {
  hover(path: string, offset: number): IntelHover | null;
  definition(path: string, offset: number): IntelDefinition | null;
  diagnostics(path: string): IntelDiagnostic[];
  symbols(path: string): IntelSymbol[];
}

const SYMBOL_KIND: Record<number, string> = {
  1: "file", 2: "module", 3: "namespace", 4: "package", 5: "class", 6: "method",
  7: "property", 8: "field", 9: "constructor", 10: "enum", 11: "interface",
  12: "function", 13: "variable", 14: "constant", 15: "string", 16: "number",
  17: "boolean", 18: "array", 19: "object", 20: "key", 21: "null",
  22: "enum member", 23: "struct", 24: "event", 25: "operator", 26: "type param",
};

function languageOf(path: string): "json" | "css" | "html" | null {
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".css")) return "css";
  if (/\.html?$/.test(path)) return "html";
  return null;
}

function hoverText(hover: Hover | null): IntelHover | null {
  if (!hover) return null;
  const c = hover.contents;
  const parts: string[] = [];
  const push = (x: unknown) => {
    if (typeof x === "string") parts.push(x);
    else if (x && typeof x === "object" && "value" in x) parts.push(String((x as { value: unknown }).value));
  };
  if (Array.isArray(c)) c.forEach(push);
  else push(c);
  const text = parts.join("\n\n").trim();
  return text ? { text } : null;
}

export function createWebService(files: Record<string, string>): WebService {
  const jsonLs = getJsonLanguageService({});
  const cssLs = getCSSLanguageService();
  const htmlLs = getHtmlLanguageService();

  const docs = new Map<string, TextDocument>();
  const docFor = (path: string): TextDocument | null => {
    const lang = languageOf(path);
    const text = files[path];
    if (!lang || text === undefined) return null;
    let doc = docs.get(path);
    if (!doc) {
      doc = TextDocument.create(`file:///${path}`, lang, 1, text);
      docs.set(path, doc);
    }
    return doc;
  };

  const toDiag = (doc: TextDocument, d: Diagnostic): IntelDiagnostic => ({
    from: doc.offsetAt(d.range.start),
    to: doc.offsetAt(d.range.end),
    severity: d.severity === 1 ? "error" : d.severity === 2 ? "warning" : "info",
    message: d.message,
  });

  const toSymbols = (doc: TextDocument, syms: SymbolInformation[]): IntelSymbol[] =>
    syms.map((s) => ({
      name: s.name,
      kind: SYMBOL_KIND[s.kind] ?? "symbol",
      line: s.location.range.start.line + 1,
    }));

  const toDefinition = (path: string, doc: TextDocument, loc: Location | null): IntelDefinition | null =>
    loc ? { path, offset: doc.offsetAt(loc.range.start) } : null;

  return {
    hover(path, offset) {
      const doc = docFor(path);
      if (!doc) return null;
      const pos = doc.positionAt(offset);
      switch (languageOf(path)) {
        case "json":
          // Schemaless JSON hover has nothing useful to say (the service's
          // hover content comes from schemas); stay silent by design.
          return null;
        case "css":
          return hoverText(cssLs.doHover(doc, pos, cssLs.parseStylesheet(doc)));
        case "html":
          return hoverText(htmlLs.doHover(doc, pos, htmlLs.parseHTMLDocument(doc)));
        default:
          return null;
      }
    },

    definition(path, offset) {
      const doc = docFor(path);
      if (!doc) return null;
      if (languageOf(path) !== "css") return null;
      const loc = cssLs.findDefinition(doc, doc.positionAt(offset), cssLs.parseStylesheet(doc));
      return toDefinition(path, doc, loc);
    },

    diagnostics(path) {
      const doc = docFor(path);
      if (!doc) return [];
      switch (languageOf(path)) {
        case "css":
          return cssLs
            .doValidation(doc, cssLs.parseStylesheet(doc))
            .map((d) => toDiag(doc, d));
        case "json": {
          // Syntax errors live on the parsed document; schema-less world.
          const parsed = jsonLs.parseJSONDocument(doc) as unknown as {
            syntaxErrors?: Diagnostic[];
          };
          return (parsed.syntaxErrors ?? []).map((d) => toDiag(doc, d));
        }
        default:
          return [];
      }
    },

    symbols(path) {
      const doc = docFor(path);
      if (!doc) return [];
      switch (languageOf(path)) {
        case "json":
          return toSymbols(doc, jsonLs.findDocumentSymbols(doc, jsonLs.parseJSONDocument(doc)));
        case "css":
          return toSymbols(doc, cssLs.findDocumentSymbols(doc, cssLs.parseStylesheet(doc)));
        case "html":
          return toSymbols(doc, htmlLs.findDocumentSymbols(doc, htmlLs.parseHTMLDocument(doc)));
        default:
          return [];
      }
    },
  };
}
