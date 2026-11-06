// The hand-written examples on disk, as the scripts read them: modern showcases
// (src/showcases/<web-features id>) and reference examples (src/examples/<feature id>).

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Example } from "../src/data";
import { SHOWCASE_CSS, splitChoices, writtenCss } from "../src/standalone-document";

export const FOLDERS = [
  { dir: "src/showcases", base: SHOWCASE_CSS },
  { dir: "src/examples", base: writtenCss(false) },
];

/** Ids of the examples in `dir`, limited to `wanted` when it is not empty. */
export async function exampleIds(dir: string, wanted: string[] = []): Promise<string[]> {
  const ids = (await readdir(dir)).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5));
  return ids.filter((id) => !wanted.length || wanted.includes(id)).sort();
}

export async function readExample(dir: string, id: string): Promise<Example | null> {
  const read = async (ext: string) => {
    const file = Bun.file(join(dir, `${id}.${ext}`));
    return (await file.exists()) ? (await file.text()).trim() || null : null;
  };
  const html = await read("html");
  if (!html) return null;
  const txt = await read("txt");
  return { html, css: await read("css"), js: await read("js"), choices: txt ? splitChoices(txt) : null };
}
