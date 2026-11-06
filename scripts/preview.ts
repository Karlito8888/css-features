/**
 * Write a showcase or a reference example as a standalone HTML document, to open it in a browser
 * before the site is built. An id found in both folders writes both files.
 *
 * Run: bun scripts/preview.ts <id>
 * Output: /tmp/css-showcases-<id>.html, /tmp/css-examples-<id>.html
 */

import { basename } from "node:path";
import { standaloneDocument } from "../src/standalone-document";
import { FOLDERS, readExample } from "./example-files";

const id = process.argv[2];
if (!id) throw new Error("Usage: bun scripts/preview.ts <id>");

let written = 0;
for (const { dir, base } of FOLDERS) {
  const example = await readExample(dir, id);
  if (!example) continue;
  const out = `/tmp/css-${basename(dir)}-${id}.html`;
  await Bun.write(out, standaloneDocument(example, id, base));
  console.log(out);
  written++;
}
if (!written) throw new Error(`No ${id}.html in ${FOLDERS.map((f) => f.dir).join(" or ")}`);
