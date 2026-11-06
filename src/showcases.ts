// Modern CSS showcases: one hand-written demo per headline feature of the gallery, named after
// the web-features id: src/showcases/<id>.html (+ optional .css and .js). The build fails when a
// showcase uses none of the feature's reference keys; the keys it does use are shown as solid chips.

import { featureById, type Example, type Modern } from "./data";

const FILES = import.meta.glob<string>("./showcases/*.{html,css,js}", { query: "?raw", import: "default", eager: true });

export type Showcase = { example: Example; used: Set<string> };

/** A pattern that finds a feature where CSS authors write it: `name:` for properties, `@name` for at-rules, the selector text, `name(` for functions. */
export function keyPattern(id: string): RegExp {
  const f = featureById.get(id)!;
  const esc = f.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  switch (f.kind) {
    case "property":
      return f.name === "--*" ? /--[\w-]+\s*:/ : new RegExp(`(?<![\\w-])${esc}\\s*:`);
    case "at-rule":
      return new RegExp(`${esc}(?![\\w-])`);
    case "selector":
      return /[a-z]/i.test(f.name) ? new RegExp(esc.replace(/\\\(\\\)$/, "\\(")) : new RegExp(esc);
    case "function":
      return new RegExp(`(?<![\\w-])${esc.replace(/\\\(\\\)$/, "\\(")}`);
    case "type":
      return new RegExp(esc.replace(/^<|>$/g, "").replace(/-percentage$/, ""));
  }
}

export function showcaseFor(modern: Modern): Showcase | null {
  const read = (ext: string) => FILES[`./showcases/${modern.id}.${ext}`]?.trim() || null;
  const html = read("html");
  if (!html) return null;
  const example: Example = { html, css: read("css"), js: read("js"), choices: null };
  const source = [html, example.css, example.js].filter(Boolean).join("\n");
  const used = new Set(modern.keys.filter((id) => keyPattern(id).test(source)));
  if (modern.keys.length && !used.size) {
    throw new Error(`Showcase "${modern.id}" uses none of ${modern.keys.map((id) => featureById.get(id)!.name).join(", ")}`);
  }
  return { example, used };
}

export const showcaseIds = new Set(Object.keys(FILES).map((f) => f.replace(/^\.\/showcases\/|\.(html|css|js)$/g, "")));
