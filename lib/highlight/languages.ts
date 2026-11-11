import { StreamLanguage } from "@codemirror/language";
import { rust } from "@codemirror/legacy-modes/mode/rust";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { c } from "@codemirror/legacy-modes/mode/clike";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import { yaml } from "@codemirror/legacy-modes/mode/yaml";
import type { VfsLanguage } from "@/lib/vfs/types";

/** Parsers for the public projects' source languages, shared by cat and Vim. */
export const projectLanguages = {
  rust: StreamLanguage.define(rust),
  lua: StreamLanguage.define(lua),
  c: StreamLanguage.define(c),
  toml: StreamLanguage.define(toml),
  yaml: StreamLanguage.define(yaml),
};

export function projectLanguage(language: VfsLanguage) {
  return projectLanguages[language as keyof typeof projectLanguages] ?? null;
}
