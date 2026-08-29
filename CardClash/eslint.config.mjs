// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";

const nodeGlobals = {
  Buffer: "readonly",
  __dirname: "readonly",
  console: "readonly",
  module: "readonly",
  process: "readonly",
  require: "readonly",
};

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "web-build/**",
      "node_modules/**",
      ".expo/**",
      ".history/**",
      ".snapshots/**",
      ".git_disabled/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  expoConfig,
  {
    files: ["scripts/**/*.js", "scripts/**/*.mjs"],
    languageOptions: {
      sourceType: "module",
      globals: {
        Buffer: "readonly",
        console: "readonly",
        process: "readonly",
      },
    },
  },
  {
    files: ["scripts/refactor-text.js", "scripts/replace-fonts.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: nodeGlobals,
    },
  },
]);
