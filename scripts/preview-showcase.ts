/**
 * Write one showcase as a standalone HTML document, to open it in a browser before the site is built.
 *
 * Run: bun scripts/preview-showcase.ts <modern feature id> [output path]
 * Default output: /tmp/css-showcase-<id>.html
 */

import { join } from "node:path";
import { showcaseDocument } from "../src/showcase-document";

const [id, out = `/tmp/css-showcase-${process.argv[2]}.html`] = process.argv.slice(2);
if (!id) throw new Error("Usage: bun scripts/preview-showcase.ts <id> [output path]");

const read = async (ext: string) => {
  const file = Bun.file(join("src/showcases", `${id}.${ext}`));
  return (await file.exists()) ? (await file.text()).trim() || null : null;
};
const html = await read("html");
if (!html) throw new Error(`No src/showcases/${id}.html`);
await Bun.write(out, showcaseDocument({ html, css: await read("css"), js: await read("js"), choices: null }, id));
console.log(out);
