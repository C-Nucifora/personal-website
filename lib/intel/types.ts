/**
 * Language intelligence (FLOW §8.2). All positions are 0-based document
 * offsets — CM6 and the TypeScript service both speak offsets natively,
 * so nothing converts lines/columns at the boundaries.
 */

export interface IntelHover {
  /** Plain-text hover content (type signature + docs). */
  text: string;
}

export interface IntelDefinition {
  /** Project-relative path of the defining file. */
  path: string;
  offset: number;
}

export interface IntelDiagnostic {
  from: number;
  to: number;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface IntelSymbol {
  name: string;
  kind: string;
  /** 1-based line, for the `:symbols` outline. */
  line: number;
}

/** What every provider — tier 2 or 3 — implements. */
export interface IntelProvider {
  hover(path: string, offset: number): Promise<IntelHover | null>;
  definition(path: string, offset: number): Promise<IntelDefinition | null>;
  diagnostics(path: string): Promise<IntelDiagnostic[]>;
  symbols(path: string): Promise<IntelSymbol[]>;
  dispose(): void;
}
