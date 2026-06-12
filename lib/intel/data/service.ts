/**
 * Tier-3 "lite" intelligence for YAML and TOML (spec 2026-06-12):
 * diagnostics + document symbols from maintained, browser-clean parsers
 * (`yaml`, `smol-toml`). The full LSPs (yaml-language-server, taplo) ship
 * node-flavored builds that are fragile in browser workers — recorded
 * trade-off: hover and definition stay silent for these languages.
 */
import { parseDocument } from "yaml";
import { parse as parseToml, TomlError } from "smol-toml";
import type { IntelDefinition, IntelDiagnostic, IntelHover, IntelSymbol } from "../types";

export interface DataService {
  hover(path: string, offset: number): IntelHover | null;
  definition(path: string, offset: number): IntelDefinition | null;
  diagnostics(path: string): IntelDiagnostic[];
  symbols(path: string): IntelSymbol[];
}

const isYaml = (p: string) => /\.ya?ml$/.test(p);
const isToml = (p: string) => p.endsWith(".toml");

function lineOfOffset(text: string, offset: number): number {
  return text.slice(0, offset).split("\n").length;
}

function yamlDiagnostics(text: string): IntelDiagnostic[] {
  const doc = parseDocument(text);
  return doc.errors.map((e) => ({
    from: e.pos[0],
    to: Math.max(e.pos[1], e.pos[0] + 1),
    severity: "error" as const,
    message: e.message.split("\n")[0],
  }));
}

function yamlSymbols(text: string): IntelSymbol[] {
  const doc = parseDocument(text);
  const contents = doc.contents;
  if (!contents || !("items" in contents)) return [];
  const out: IntelSymbol[] = [];
  for (const item of (contents as { items: unknown[] }).items) {
    const pair = item as { key?: { value?: unknown; range?: [number, number, number] } };
    if (pair.key?.value !== undefined && pair.key.range) {
      out.push({
        name: String(pair.key.value),
        kind: "key",
        line: lineOfOffset(text, pair.key.range[0]),
      });
    }
  }
  return out;
}

function tomlDiagnostics(text: string): IntelDiagnostic[] {
  try {
    parseToml(text);
    return [];
  } catch (e) {
    if (e instanceof TomlError) {
      // TomlError reports 1-based line/column; fold into an offset.
      const lines = text.split("\n");
      const lineIdx = Math.max(0, Math.min(e.line - 1, lines.length - 1));
      const offset =
        lines.slice(0, lineIdx).reduce((n, l) => n + l.length + 1, 0) +
        Math.max(0, e.column - 1);
      return [
        {
          from: Math.min(offset, text.length),
          to: Math.min(offset + 1, text.length),
          severity: "error",
          message: e.message.split("\n")[0],
        },
      ];
    }
    return [{ from: 0, to: 1, severity: "error", message: "invalid TOML" }];
  }
}

function tomlSymbols(text: string): IntelSymbol[] {
  // Structural scan: [tables] and top-level keys. Parser positions aren't
  // exposed by smol-toml, and a line scan is exact for these two shapes.
  const out: IntelSymbol[] = [];
  let inTable = false;
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    const table = /^\[\[?([^\]]+)\]?\]$/.exec(line);
    if (table) {
      out.push({ name: table[1].trim(), kind: "table", line: i + 1 });
      inTable = true;
      return;
    }
    if (!inTable) {
      const kv = /^([A-Za-z0-9_-]+)\s*=/.exec(line);
      if (kv) out.push({ name: kv[1], kind: "key", line: i + 1 });
    }
  });
  return out;
}

export function createDataService(files: Record<string, string>): DataService {
  const get = (path: string): string | null => files[path] ?? null;

  return {
    hover: () => null,
    definition: () => null,

    diagnostics(path) {
      const text = get(path);
      if (text === null) return [];
      if (isYaml(path)) return yamlDiagnostics(text);
      if (isToml(path)) return tomlDiagnostics(text);
      return [];
    },

    symbols(path) {
      const text = get(path);
      if (text === null) return [];
      if (isYaml(path)) return yamlSymbols(text);
      if (isToml(path)) return tomlSymbols(text);
      return [];
    },
  };
}
