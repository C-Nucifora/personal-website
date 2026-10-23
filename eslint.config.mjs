import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "concept/rack/vendor/**",
    "next-env.d.ts",
  ]),
  {
    files: ["concept/rack/*.js"],
    // These browser modules are not Next.js modules. Rack units use the
    // ordinary local name `module`; Next's CommonJS guard does not apply.
    rules: { "@next/next/no-assign-module-variable": "off" },
  },
  {
    files: ["concept/rack/*.js", "api/*.mjs", "server/*.mjs", "scripts/*.mjs"],
    // TypeScript checks the earlier app; keep undefined names checked in
    // the JavaScript that builds and serves the current rack portfolio.
    rules: { "no-undef": "error" },
  },
]);

export default eslintConfig;
