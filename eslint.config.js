// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "dev-dist/**",
      "coverage/**",
      "node_modules/**",
      // Generated native project (Capacitor) — not TS/JS this project owns.
      "android/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: { import: importPlugin },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  // A21: "Domain must not import Phaser." Systems/application sit on top of
  // domain and must stay engine-agnostic too; only app (composition root),
  // presentation, and infrastructure are allowed to touch Phaser/SDKs.
  {
    files: ["src/domain/**/*.ts", "src/systems/**/*.ts", "src/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["phaser", "phaser/*"],
              message:
                "Domain/systems/application code must stay engine-agnostic. Phaser may only be imported from src/app/** or src/presentation/**.",
            },
          ],
        },
      ],
    },
  },
  // The rest of the layering from PROJECT_MEMORY:
  //   domain -> systems -> application -> presentation, and infrastructure
  //   off to the side. Dependencies point inward only. This used to hold by
  //   convention alone; only the Phaser edge above was enforced, so nothing
  //   stopped the other edges decaying one hurried import at a time.
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@systems/*",
                "@application/*",
                "@presentation/*",
                "@infrastructure/*",
                "@app/*",
              ],
              message:
                "Domain is the innermost layer and may not import from any outer one. A port the domain needs (a Clock, a storage interface) belongs in src/domain/ with its adapter outside.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/systems/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@presentation/*", "@app/*", "@infrastructure/*"],
              message:
                "Systems may import domain only. Presentation and the composition root sit above them, and infrastructure adapters must arrive by injection rather than import.",
            },
            {
              group: ["phaser", "phaser/*"],
              message: "Systems must stay engine-agnostic.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@presentation/*", "@app/*"],
              message:
                "Application services observe events; they never reach up into presentation or the composition root.",
            },
            {
              group: ["phaser", "phaser/*"],
              message: "Application services must stay engine-agnostic.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/infrastructure/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@presentation/*", "@app/*", "@systems/*"],
              message:
                "Infrastructure implements ports defined further in; it must not depend on systems, presentation or the composition root.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.js"],
    ...tseslint.configs.disableTypeChecked,
  },
  prettierConfig,
);
