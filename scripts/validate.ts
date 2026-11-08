/**
 * Send every hand-written example (modern showcases and reference examples) to the W3C Nu HTML
 * Checker and fail on any HTML error. This is what proves their markup conforms to the HTML standard.
 * The checker's CSS parser lags behind modern CSS by design here, so CSS messages are printed
 * and tolerated; they are not what this check is for. One HTML error is tolerated too: the
 * `interestfor` attribute, which Chrome ships but HTML has not merged yet
 * (https://github.com/whatwg/html/pull/11006), so the checker rejects it on every interest source.
 * Run: bun run validate [id...]   (no id: every example of both folders)
 * The public checker rate-limits bursts. A local one works too: download vnu.jar (validator/validator
 * on GitHub), `java -cp vnu.jar nu.validator.servlet.Main 8888`, then `CHECKER=http://localhost:8888/?out=json bun run validate`.
 */

import { standaloneDocument } from "../src/standalone-document";
import { FOLDERS, exampleIds, readExample } from "./example-files";

const CHECKER = process.env.CHECKER ?? "https://validator.w3.org/nu/?out=json";
const INTERESTFOR = /^Attribute “interestfor” not allowed on element “[^”]+” at this point\.$/;

type Message = { type: string; subType?: string; message: string; lastLine?: number; extract?: string };
const wanted = process.argv.slice(2);
let errors = 0;

for (const { dir, base } of FOLDERS) {
  for (const id of await exampleIds(dir, wanted)) {
    const doc = standaloneDocument((await readExample(dir, id))!, id, base);
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
    if (!res.ok) throw new Error(`Checker answered HTTP ${res.status} for ${dir}/${id}`);
    const { messages } = (await res.json()) as { messages: Message[] };
    const tolerated = (m: Message) => m.message.startsWith("CSS:") || INTERESTFOR.test(m.message);
    const failed = messages.filter((m) => (m.type === "error" || m.subType === "fatal") && !tolerated(m));
    errors += failed.length;
    console.log(`${failed.length ? "✗" : "✓"} ${dir}/${id}: ${failed.length} HTML errors, ${messages.length - failed.length} other messages`);
    for (const m of messages) {
      const kind = tolerated(m) ? "tolerated" : `${m.type}${m.subType ? `/${m.subType}` : ""}`;
      console.log(`    ${kind} line ${m.lastLine ?? "?"}: ${m.message}`);
    }
  }
}

if (errors) {
  console.error(`${errors} validation errors.`);
  process.exit(1);
}
