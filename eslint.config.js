// @ts-check
import js from "@eslint/js";
import barrelFiles from "eslint-plugin-barrel-files";
import checkFile from "eslint-plugin-check-file";
import importX from "eslint-plugin-import-x";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/dist-*/**",
      "**/.vite/**",
      "**/build/**",
      "**/*.config.js",
      "**/*.config.ts",
      "**/vite.config.*",
      "**/tailwind.config.*",
      "**/postcss.config.*",
      "**/*.test.ts",
      "**/*.test.tsx",
      "agent-*.js",
      "**/scripts/**/*.mjs",
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "import-x": importX,
      "barrel-files": barrelFiles,
      "check-file": checkFile,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "prefer-arrow-callback": "error",
      "arrow-body-style": ["error", "as-needed"],

      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "variable",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
          custom: {
            regex: "^(_|[xyz]|.{2,})$",
            match: true,
          },
        },
        {
          selector: "parameter",
          format: ["camelCase", "PascalCase"],
          leadingUnderscore: "allowSingleOrDouble",
          filter: {
            regex: "^_+$",
            match: false,
          },
          custom: {
            regex: "^([xyz]|.{2,})$",
            match: true,
          },
        },
        {
          selector: "function",
          format: ["camelCase", "PascalCase"],
        },
        {
          selector: "typeParameter",
          format: ["PascalCase"],
          custom: { regex: "^[A-Z]([a-zA-Z0-9]*)?$", match: true },
        },
        {
          selector: "interface",
          format: ["PascalCase"],
        },
        {
          selector: "typeAlias",
          format: ["PascalCase"],
        },
        {
          selector: "class",
          format: ["PascalCase"],
        },
        {
          selector: "enum",
          format: ["PascalCase"],
        },
        {
          selector: "enumMember",
          format: ["PascalCase", "UPPER_CASE"],
        },
        {
          selector: "property",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        {
          selector: "objectLiteralProperty",
          format: null,
        },
        {
          selector: "typeProperty",
          format: null,
        },
        {
          selector: "import",
          format: null,
        },
      ],

      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/array-type": ["error", { default: "generic" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/promise-function-async": "off",
      "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }],
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],

      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",

      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],

      "id-denylist": [
        "error",
        "btn", "cb", "ctx", "el", "elem", "err", "evt", "fn", "idx",
        "msg", "num", "obj", "opts", "params", "pkg", "ptr", "req",
        "res", "ret", "str", "temp", "tmp", "val", "var",
      ],

      "import-x/extensions": ["error", "never", { ignorePackages: true }],
      "import-x/no-useless-path-segments": ["error", { noUselessIndex: true }],

      "barrel-files/avoid-barrel-files": "error",
      "barrel-files/avoid-re-export-all": "error",
      "barrel-files/avoid-namespace-import": "warn",

      ...reactHooks.configs.recommended.rules,
      "react/jsx-no-target-blank": "error",
      "react/jsx-curly-brace-presence": [
        "error",
        { props: "never", children: "never" },
      ],

      "@typescript-eslint/no-unnecessary-type-parameters": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-empty-function": [
        "error",
        { allow: ["arrowFunctions"] },
      ],
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-confusing-void-expression": [
        "error",
        { ignoreArrowShorthand: true },
      ],
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/consistent-indexed-object-style": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },

  {
    files: ["**/src/index.ts", "**/src/index.tsx"],
    rules: {
      "barrel-files/avoid-barrel-files": "off",
      "barrel-files/avoid-re-export-all": "off",
    },
  },

  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      "prefer-arrow-callback": "error",
      "prefer-const": "error",
      "no-var": "error",
    },
  }
);
