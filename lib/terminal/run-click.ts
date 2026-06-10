/**
 * The single entry point for every click that has a command equivalent
 * (FLOW.md §5, §12.1). The executor registers the direct implementation;
 * the animation engine replaces it with the type-on version. Clickable
 * output closes over this function, so the swap applies everywhere at once.
 */
let impl: (cmd: string) => void = () => {};

export function setRunClickImpl(f: (cmd: string) => void): void {
  impl = f;
}

export function runClick(cmd: string): void {
  impl(cmd);
}
