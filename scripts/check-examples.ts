/**
 * Check the reference examples (src/examples/) in headless Chrome (the installed google-chrome,
 * no dependency): each one at 330 px and 900 px wide, light and dark, with every value choice applied.
 * Fails on a page error, a missing #example-element, horizontal overflow, or a supported choice
 * that changes nothing (the computed values it declares, or for a rule block the computed style of
 * every element, equal those of another supported choice). Choices this Chrome does not support
 * are listed, not failed. Writes one screenshot per example (330 light, 330 dark, 900 light) for a
 * human look.
 *
 * Run: bun scripts/check-examples.ts [id...]   (no id: every example)
 * Output: /tmp/css-examples-check/<id>.png
 */

import { mkdir, rm } from "node:fs/promises";
import { standaloneDocument, writtenCss } from "../src/standalone-document";
import { exampleIds, readExample } from "./example-files";

const DIR = "src/examples";
const OUT = "/tmp/css-examples-check";
const CHROME = process.env.CHROME ?? "google-chrome";
const FRAMES = [
  { width: 330, dark: false },
  { width: 330, dark: true },
  { width: 900, dark: false },
  { width: 900, dark: true },
];
const BATCH = 20;

type Row = { choice: number; supported: boolean; value: string; overflow: number };
type Result = { key: string; errors: string[]; rows: Row[] };

/**
 * Runs inside each frame, serialized with toString(). Applies each choice as the page does, lets
 * transitions finish, and reports what it measured to the harness.
 */
function probe(key: string, choices: string[]) {
  const errors: string[] = [];
  addEventListener("error", (e) => errors.push(e instanceof ErrorEvent ? e.message : e.type));
  const el = document.getElementById("example-element");
  if (!el) errors.push("no #example-element");
  const style = document.body.appendChild(document.createElement("style"));
  const isBlock = (c: string) => c.includes("{");
  const declared = (c: string) =>
    c
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean);
  const supported = (c: string) => {
    if (!isBlock(c)) return declared(c).every((d) => CSS.supports(d));
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(c);
    return sheet.cssRules.length > 0;
  };
  const settle = () => {
    getComputedStyle(document.body).color;
    for (const a of document.getAnimations()) {
      try {
        a.finish();
      } catch {} // an infinite animation cannot finish, its computed values do not depend on it
    }
  };
  // A rule block may restyle any element: compare the computed style of all of them.
  const everything = () =>
    [...document.body.querySelectorAll("*")]
      .map((e) => {
        const cs = getComputedStyle(e);
        return [...cs].map((p) => cs.getPropertyValue(p)).join(";");
      })
      .join("|");
  const fingerprint = (c: string) => {
    if (isBlock(c)) return everything();
    const cs = getComputedStyle(el!);
    // An empty value is a shorthand Chrome does not serialize: not comparable, left out.
    return declared(c)
      .map((d) => cs.getPropertyValue(d.slice(0, d.indexOf(":")).trim()))
      .filter(Boolean)
      .join(";");
  };
  // Rule blocks start from no choice at all (row -1), so a block that matches nothing is caught.
  // The standalone document carries the first block already: take it out first.
  document.querySelector("style[data-choice]")?.remove();
  settle();
  const baseline = el && choices.some(isBlock) ? [{ choice: -1, supported: true, value: everything(), overflow: 0 }] : [];
  const rows = el
    ? (choices.length ? choices : [""]).map((c, i) => {
        if (isBlock(c)) style.textContent = c;
        else if (c) el.style.cssText = c;
        settle();
        const root = document.documentElement;
        return { choice: i, supported: !c || supported(c), value: c ? fingerprint(c) : "", overflow: root.scrollWidth - root.clientWidth };
      })
    : [];
  rows.unshift(...baseline);
  parent.postMessage({ key, errors, rows }, "*");
}

const harness = (frames: { key: string; width: number; doc: string }[]) => `<!doctype html><meta charset="utf-8">
<style>body{margin:0;display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start}iframe{border:0;height:640px}</style>
${frames.map((f) => `<iframe data-key="${f.key}" style="width:${f.width}px" srcdoc="${f.doc.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"></iframe>`).join("\n")}
<pre id="out"></pre>
<script>
const results = [];
addEventListener("message", (e) => {
  results.push(e.data);
  if (results.length === ${frames.length}) document.getElementById("out").textContent = JSON.stringify(results);
});
</script>`;

const chrome = async (args: string[]) => {
  const proc = Bun.spawn([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars", ...args], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out;
};

const ids = await exampleIds(DIR, process.argv.slice(2));
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
let failures = 0;

for (let start = 0; start < ids.length; start += BATCH) {
  const batch = ids.slice(start, start + BATCH);
  const examples = new Map(await Promise.all(batch.map(async (id) => [id, (await readExample(DIR, id))!] as const)));
  const frame = (id: string, width: number, dark: boolean, measure: boolean) => {
    const example = examples.get(id)!;
    const key = `${id} ${width}px ${dark ? "dark" : "light"}`;
    const doc = standaloneDocument(example, id, writtenCss(dark));
    const script = `<script>(${probe.toString()})(${JSON.stringify(key)}, ${JSON.stringify(example.choices ?? [])});</script>`;
    return { key, width, doc: measure ? doc.replace(/<\/body>/, `${script}</body>`) : doc };
  };

  const page = `${OUT}/harness.html`;
  await Bun.write(page, harness(batch.flatMap((id) => FRAMES.map((f) => frame(id, f.width, f.dark, true)))));
  const dom = await chrome(["--virtual-time-budget=60000", "--dump-dom", `file://${page}`]);
  const json = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)?.[1];
  if (!json) throw new Error(`Chrome reported nothing for ${batch.join(", ")}`);
  const results: Result[] = JSON.parse(json.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&"));

  for (const id of batch) {
    const problems = new Set<string>();
    const unsupported = new Set<number>();
    for (const r of results.filter((r) => r.key.startsWith(`${id} `))) {
      const key = r.key;
      for (const e of r.errors) problems.add(`${key}: ${e}`);
      const supported = r.rows.filter((row) => row.supported);
      for (const row of r.rows) {
        if (!row.supported) unsupported.add(row.choice + 1);
        if (row.overflow > 0) problems.add(`${key}: choice ${row.choice + 1} overflows by ${row.overflow}px`);
        const twin = supported.find((o) => o.choice < row.choice && row.supported && row.value && o.value === row.value);
        if (twin) problems.add(`${key}: choice ${row.choice + 1} ${twin.choice < 0 ? "changes nothing" : `computes like choice ${twin.choice + 1}`}`);
      }
    }
    failures += problems.size ? 1 : 0;
    const note = unsupported.size ? ` (not supported by this Chrome: choice ${[...unsupported].join(", ")})` : "";
    console.log(`${problems.size ? "✗" : "✓"} ${id}${note}`);
    for (const p of problems) console.log(`    ${p}`);

    // Screenshot: first choice, 330 light, 330 dark, 900 light.
    const shot = `${OUT}/${id}.html`;
    await Bun.write(shot, harness([frame(id, 330, false, false), frame(id, 330, true, false), frame(id, 900, false, false)]));
    await chrome(["--window-size=1600,660", `--screenshot=${OUT}/${id}.png`, `file://${shot}`]);
    await rm(shot);
  }
  await rm(page);
}

console.log(`${ids.length} examples checked, ${failures} failing. Screenshots in ${OUT}/`);
if (failures) process.exit(1);
