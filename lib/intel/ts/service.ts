/**
 * The tier-2 TypeScript service: a real ts.LanguageService over an
 * in-memory file map (spec 2026-06-12). Pure and synchronous — the worker
 * shell wraps it; tests exercise it directly. Bundled project slices have
 * no node_modules by design, so missing-module diagnostics are suppressed
 * while hover/gd stay fully functional across the project's own files.
 */
import ts from "typescript";
import type { IntelDefinition, IntelDiagnostic, IntelHover, IntelSymbol } from "../types";

/** Missing external modules / type packages — absent by design. */
const SUPPRESSED = new Set([2307, 2792, 7016, 2688]);

const LIB_DIR = "/__lib/";

export interface TsServiceDeps {
  /** Project-relative path → text. */
  files: Record<string, string>;
  /** lib.*.d.ts name → text (data/generated/ts-libs.json). */
  libs: Record<string, string>;
}

export interface TsService {
  hover(path: string, offset: number): IntelHover | null;
  definition(path: string, offset: number): IntelDefinition | null;
  diagnostics(path: string): IntelDiagnostic[];
  symbols(path: string): IntelSymbol[];
}

const abs = (p: string) => `/${p}`;

const SCRIPT_EXT = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

export function createTsService({ files, libs }: TsServiceDeps): TsService {
  const store = new Map<string, string>();
  for (const [p, text] of Object.entries(files)) store.set(abs(p), text);
  for (const [name, text] of Object.entries(libs)) store.set(`${LIB_DIR}${name}`, text);

  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
    skipLibCheck: true,
    noEmit: true,
    allowImportingTsExtensions: true,
    // Repo convention: "@/x" from the project root; bundled slices keep
    // their real layout under src/, so try both.
    baseUrl: "/",
    paths: { "@/*": ["src/*", "*"] },
  };

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () =>
      [...store.keys()].filter((f) => !f.startsWith(LIB_DIR) && SCRIPT_EXT.test(f)),
    getScriptVersion: () => "1", // read-only world: nothing ever changes
    getScriptSnapshot: (f) => {
      const text = store.get(f);
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => "/",
    getCompilationSettings: () => options,
    getDefaultLibFileName: () => `${LIB_DIR}lib.es2022.d.ts`,
    fileExists: (f) => store.has(f),
    readFile: (f) => store.get(f),
  };

  const service = ts.createLanguageService(host, ts.createDocumentRegistry());

  const known = (path: string) => store.has(abs(path));

  return {
    hover(path, offset) {
      if (!known(path)) return null;
      const qi = service.getQuickInfoAtPosition(abs(path), offset);
      if (!qi) return null;
      const sig = ts.displayPartsToString(qi.displayParts);
      const docs = ts.displayPartsToString(qi.documentation);
      if (!sig) return null;
      return { text: docs ? `${sig}\n\n${docs}` : sig };
    },

    definition(path, offset) {
      if (!known(path)) return null;
      const defs = service.getDefinitionAtPosition(abs(path), offset) ?? [];
      const hit = defs.find((d) => !d.fileName.startsWith(LIB_DIR));
      if (!hit) return null;
      return { path: hit.fileName.replace(/^\//, ""), offset: hit.textSpan.start };
    },

    diagnostics(path) {
      if (!known(path)) return [];
      const f = abs(path);
      const all = [
        ...service.getSyntacticDiagnostics(f),
        ...service.getSemanticDiagnostics(f),
      ];
      return all
        .filter((d) => d.start !== undefined && !SUPPRESSED.has(d.code))
        .map((d) => ({
          from: d.start!,
          to: d.start! + (d.length ?? 0),
          severity:
            d.category === ts.DiagnosticCategory.Error
              ? ("error" as const)
              : d.category === ts.DiagnosticCategory.Warning
                ? ("warning" as const)
                : ("info" as const),
          message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
        }));
    },

    symbols(path) {
      if (!known(path)) return [];
      const f = abs(path);
      const source = service.getProgram()?.getSourceFile(f);
      if (!source) return [];
      const out: IntelSymbol[] = [];
      const walk = (node: ts.NavigationTree, depth: number) => {
        if (depth > 0 && node.spans.length > 0) {
          out.push({
            name: node.text,
            kind: node.kind,
            line: source.getLineAndCharacterOfPosition(node.spans[0].start).line + 1,
          });
        }
        if (depth < 2) for (const c of node.childItems ?? []) walk(c, depth + 1);
      };
      walk(service.getNavigationTree(f), 0);
      return out;
    },
  };
}
