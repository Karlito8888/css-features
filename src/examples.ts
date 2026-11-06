// Reference examples written for this site, replacing the MDN example of a feature:
// src/examples/<feature id>.html (+ optional .css, and .txt holding the value choices, one
// declaration block per paragraph, applied to #example-element). The build fails when an example
// never writes its feature (same check as the showcases).

import { featureById, type Example } from "./data";
import { keyPattern } from "./showcases";

const FILES = import.meta.glob<string>("./examples/*.{html,css,txt}", { query: "?raw", import: "default", eager: true });

export function writtenExample(id: string): Example | null {
  const read = (ext: string) => FILES[`./examples/${id}.${ext}`]?.trim() || null;
  const html = read("html");
  if (!html) return null;
  const example: Example = { html, css: read("css"), js: null, choices: read("txt")?.split(/\n\s*\n/) ?? null };
  if (!keyPattern(id).test([html, example.css, ...(example.choices ?? [])].join("\n"))) {
    throw new Error(`Example "${id}" never uses ${featureById.get(id)!.name}`);
  }
  return example;
}
