/**
 * Send every modern showcase to the W3C Nu HTML Checker and fail on any HTML error.
 * Showcases are hand-written, so this is what proves their markup conforms to the HTML standard.
 * The checker's CSS parser lags behind modern CSS by design here, so CSS messages are printed
 * and tolerated; they are not what this check is for.
 * Run: bun run validate [id...]   (no id: every showcase)
 * The public checker rate-limits bursts. A local one works too: download vnu.jar (validator/validator
 * on GitHub), `java -cp vnu.jar nu.validator.servlet.Main 8888`, then `CHECKER=http://localhost:8888/?out=json bun run validate`.
 */

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { showcaseDocument } from "../src/showcase-document";

const DIR = "src/showcases";
const CHECKER = process.env.CHECKER ?? "https://validator.w3.org/nu/?out=json";

type Message = { type: string; subType?: string; message: string; lastLine?: number; extract?: string };
const wanted = process.argv.slice(2);
const slugs = [...new Set((await readdir(DIR)).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5)))]
  .filter((s) => !wanted.length || wanted.includes(s))
  .sort();
let errors = 0;

for (const slug of slugs) {
  const read = async (ext: string) => {
    const file = Bun.file(join(DIR, `${slug}.${ext}`));
    return (await file.exists()) ? file.text() : null;
  };
  const html = (await read("html"))!;
  const doc = showcaseDocument({ html, css: await read("css"), js: await read("js"), choices: null }, slug);
  // The public checker rate-limits bursts: one request per second, and a pause on 429.
  let res: Response;
  for (let attempt = 0; ; attempt++) {
    await Bun.sleep(1000);
    res = await fetch(CHECKER, {
      method: "POST",
      headers: { "Content-Type": "text/html; charset=utf-8", "User-Agent": "css-features-validate" },
      body: doc,
    });
    if (res.status !== 429 || attempt === 5) break;
    await Bun.sleep(30_000 * (attempt + 1));
  }
  if (!res.ok) throw new Error(`Checker answered HTTP ${res.status} for ${slug}`);
  const { messages } = (await res.json()) as { messages: Message[] };
  const isCss = (m: Message) => m.message.startsWith("CSS:");
  const failed = messages.filter((m) => (m.type === "error" || m.subType === "fatal") && !isCss(m));
  errors += failed.length;
  console.log(`${failed.length ? "✗" : "✓"} ${slug}: ${failed.length} HTML errors, ${messages.length - failed.length} other messages`);
  for (const m of messages) {
    const kind = isCss(m) ? "css (tolerated)" : `${m.type}${m.subType ? `/${m.subType}` : ""}`;
    console.log(`    ${kind} line ${m.lastLine ?? "?"}: ${m.message}`);
  }
}

if (errors) {
  console.error(`${errors} validation errors.`);
  process.exit(1);
}
