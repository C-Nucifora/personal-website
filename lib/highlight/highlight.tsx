/**
 * Static syntax highlighting for `cat` output (FLOW §8): Lezer parse →
 * theme-token-colored spans. No CodeMirror instances in scrollback — plain
 * React nodes, colored by .tok-* classes mapped to --ansi-* variables.
 *
 * Loaded lazily by CodeBlock so parsers stay out of the initial bundle.
 */
import type { ReactNode } from "react";
import { classHighlighter, highlightCode } from "@lezer/highlight";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { markdown } from "@codemirror/lang-markdown";
import type { VfsLanguage } from "@/lib/vfs/types";
import type { Parser } from "@lezer/common";

function parserFor(language: VfsLanguage): Parser | null {
  switch (language) {
    case "typescript":
      return javascript({ typescript: true }).language.parser;
    case "tsx":
      return javascript({ typescript: true, jsx: true }).language.parser;
    case "javascript":
      return javascript().language.parser;
    case "json":
      return json().language.parser;
    case "css":
      return css().language.parser;
    case "html":
      return html().language.parser;
    case "markdown":
      return markdown().language.parser;
    default:
      return null;
  }
}

/** Highlight code into an array of lines, each a list of plain/span nodes. */
export function highlightLines(code: string, language: VfsLanguage): ReactNode[][] {
  const parser = parserFor(language);
  if (!parser) return code.split("\n").map((l) => [l]);

  const lines: ReactNode[][] = [[]];
  let key = 0;
  highlightCode(
    code,
    parser.parse(code),
    classHighlighter,
    (text, classes) => {
      lines[lines.length - 1].push(
        classes ? (
          <span key={key++} className={classes}>
            {text}
          </span>
        ) : (
          text
        ),
      );
    },
    () => lines.push([]),
  );
  return lines;
}
