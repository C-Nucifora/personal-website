/**
 * Non-React bridge to environment owned by React providers. The theme lives
 * in ThemeProvider (context + localStorage); commands reach it through here
 * so the executor never touches React.
 */
import { DEFAULT_THEME_ID } from "@/lib/themes";

export interface ThemeEnv {
  getThemeId(): string;
  setTheme(id: string): boolean;
}

let themeEnv: ThemeEnv = {
  getThemeId: () => DEFAULT_THEME_ID,
  setTheme: () => false,
};

export function registerThemeEnv(env: ThemeEnv): void {
  themeEnv = env;
}

export function getThemeEnv(): ThemeEnv {
  return themeEnv;
}
