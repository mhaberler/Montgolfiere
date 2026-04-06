import js from "@eslint/js";
import globals from "globals";
import pluginVue from "eslint-plugin-vue";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import vueParser from "vue-eslint-parser";

const isProduction = process.env.NODE_ENV === "production";

// Vite environment variables injected at build time
const viteGlobals = {
  __APP_VERSION__: "readonly",
  __GIT_COMMIT_HASH__: "readonly",
  __GIT_COMMIT_MESSAGE__: "readonly",
  __GIT_BRANCH_NAME__: "readonly",
  __GIT_TAG__: "readonly",
  __VITE_BUILD_DATE__: "readonly",
};

// Library globals
const libraryGlobals = {
  d3: "readonly",
};

// Web APIs
const webApiGlobals = {
  PositionOptions: "readonly",
  Buffer: "readonly",
};

export default [
  {
    ignores: [
      "dist",
      "dist.webtest",
      "build",
      "node_modules",
      ".gradle",
      "ios",
      "android",
      ".venv",
      "coverage",
      "*.min.js",
      ".eslintignore",
      ".eslintrc.cjs",
      "untracked/**",
      ".git",
      ".idea",
      "python/**",
    ],
  },
  // Test files (must come before general TypeScript pattern)
  {
    files: ["**/*.cy.ts", "**/*.cy.js", "**/*.spec.ts", "**/*.spec.js"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.mocha, // Cypress uses Mocha (includes: describe, it, before, after, etc.)
        ...globals.vitest, // Vitest globals (includes: describe, it, expect, etc.)
        cy: "readonly", // Cypress command object
      },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // JavaScript files
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-console": isProduction ? "warn" : "off",
      "no-debugger": isProduction ? "warn" : "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  // Vue files
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: typescriptParser,
        ecmaVersion: 2020,
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...viteGlobals,
        ...libraryGlobals,
        ...webApiGlobals,
      },
    },
    plugins: {
      vue: pluginVue,
      "@typescript-eslint": typescriptEslint,
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-console": isProduction ? "warn" : "off",
      "no-debugger": isProduction ? "warn" : "off",
      "vue/no-deprecated-slot-attribute": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // TypeScript definition files - relaxed rules
  {
    files: ["**/*.d.ts"],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // TypeScript files (general)
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.cts", "**/*.mts"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...viteGlobals,
        ...libraryGlobals,
        ...webApiGlobals,
        NodeJS: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-console": isProduction ? "warn" : "off",
      "no-debugger": isProduction ? "warn" : "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
