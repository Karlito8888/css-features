import { defineConfig } from "vite-plus";

/** Generated files and tool-managed folders: never linted, never formatted. */
const managed = ["dist/**", ".astro/**"];

/**
 * Content whose bytes are the product, never formatted: `data/` is written by `scripts/sync.ts`;
 * the showcases and reference examples are hand-written HTML/CSS validated as they stand (Nu
 * checker, headless Chrome).
 */
const content = ["data/**", "src/examples/**", "src/showcases/**"];

/**
 * Vite+ config: lint and format settings for `vp check`; Astro itself keeps `astro.config.mjs`.
 * Oxfmt does not format `.astro` files: `astro check` covers them.
 * @see https://viteplus.dev/config.md (vite-plus 1.6.0)
 */
export default defineConfig({
  lint: {
    ignorePatterns: managed,
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    sortPackageJson: false,
    ignorePatterns: ["**/*.md", ...managed, ...content],
  },
  staged: { "*.{ts,tsx,js,jsx,cjs,mjs,json}": "vp check --fix" },
});
