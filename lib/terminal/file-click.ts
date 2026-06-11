/**
 * What clicking a file name runs (FLOW.md §8): prose renders inline via
 * `cat`; code opens the read-only vim viewer. The viewer arrives in a later
 * phase — until then everything cats.
 */
const CODE_EXTENSIONS =
  /\.(ts|tsx|js|jsx|mjs|cjs|json|css|html|sh|py|go|rs|lua|c|h|vim|scm|m1scr|yml|yaml|toml)$/i;

export function isCodeFile(name: string): boolean {
  return CODE_EXTENSIONS.test(name);
}

export function commandForFile(name: string): string {
  return isCodeFile(name) ? `vim ${name}` : `cat ${name}`;
}
