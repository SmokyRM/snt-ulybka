import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/(cabinet)/cabinet/page.tsx"],
    rules: {
      "no-shadow": ["error", { builtinGlobals: false, hoist: "functions" }],
      "no-redeclare": "error",
    },
  },
  {
    files: ["middleware.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            "crypto",
            "node:crypto",
            "fs",
            "node:fs",
            "fs/promises",
            "node:fs/promises",
            "path",
            "node:path",
          ],
        },
      ],
    },
  },
  {
    files: ["app/(public)/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "app/admin/*",
            "app/admin/**",
            "src/components/admin/*",
            "src/components/admin/**",
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
