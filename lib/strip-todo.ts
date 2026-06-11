/**
 * Placeholder hygiene: data files may carry "TODO " prefixes until real
 * content lands, but nothing a visitor sees may render the literal word.
 * Single source for the strip rule — components and builders share it.
 */
export const stripTodo = (s: string): string => s.replace(/^TODO\s*/, "").trim();

/** Strip a list and drop items that were nothing but the placeholder. */
export const stripTodoList = (items: readonly string[]): string[] =>
  items.map(stripTodo).filter(Boolean);
