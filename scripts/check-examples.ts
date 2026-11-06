/**
 * Check the reference examples (src/examples/) in headless Chrome (the installed google-chrome,
 * no dependency): each one at 330 px and 900 px wide, light and dark, with every value choice applied.
 * Fails on a page error, a missing #example-element, horizontal overflow, or a supported choice
 * that changes nothing (the computed values it declares, or for a rule block the computed style of
 * every element, equal those of another supported choice). Choices this Chrome does not support,
 * and rule blocks whose selector only matches on interaction (INTERACTIVE), are listed, not
 * failed. Writes one contact sheet per example for a human look: a row per
 * choice, at 330 px light, 330 px dark and 600 px light (about the desktop preview width).
 *
 * Run: bun scripts/check-examples.ts [id...]   (no id: every example)
 * Output: /tmp/css-examples-check/<id>.png
 */

import { mkdir, rm } from "node:fs/promises";
import { declarations, standaloneDocument, writtenCss } from "../src/standalone-document";
import { exampleIds, readExample } from "./example-files";

// EXAMPLES_DIR checks drafts kept outside the repo (same file layout as src/examples).
const DIR = process.env.EXAMPLES_DIR ?? "src/examples";
const OUT = "/tmp/css-examples-check";
const CHROME = process.env.CHROME ?? "google-chrome";
const FRAMES = [
  { width: 330, dark: false },
  { width: 330, dark: true },
  { width: 900, dark: false },
  { width: 900, dark: true },
];
const BATCH = 20;
/** Frame height of the measuring harness, and of each row of the contact sheet. */
const MEASURE_HEIGHT = 640;
const SHEET_HEIGHT = 480;
/** Selectors that never match in a still frame: they need the reader to act on the page (hover, select text, find in page...) or a printer (@page). */
const INTERACTIVE = /:(hover|active|focus|focus-visible|focus-within|visited|target|target-current|user-invalid|user-valid|autofill|fullscreen|picture-in-picture|playing|paused|seeking|buffering|stalled|muted|volume-locked|popover-open|modal|interest-source|interest-target|snapped(-[a-z]+)?|active-view-transition(-type)?|selection|target-text|search-text|spelling-error|grammar-error)(?![\w-])|@page\b/;

type Row = { choice: number; supported: boolean; value: string; overflow: number };
type Result = { key: string; errors: string[]; rows: Row[] };

/**
 * Runs inside each frame, serialized with toString() (the declaration splitter is passed in).
 * Applies each choice as the page does, lets transitions finish, and reports what it measured.
 */
function probe(key: string, choices: string[], declared: typeof declarations) {
  const errors: string[] = [];
  addEventListener("error", (e) => errors.push(e instanceof ErrorEvent ? e.message : e.type));
  const el = document.getElementById("example-element");
  if (!el) errors.push("no #example-element");
  const style = document.body.appendChild(document.createElement("style"));
  const isBlock = (c: string) => c.includes("{");
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
  // A rule block may restyle any element or pseudo-element: compare the computed style of all of them.
  const everything = () =>
    [...document.body.querySelectorAll("*")]
      .flatMap((e) => [null, "::before", "::after", "::marker"].map((pseudo) => getComputedStyle(e, pseudo)))
      .map((cs) => [...cs].map((p) => cs.getPropertyValue(p)).join(";"))
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

const harness = (frames: { key: string; width: number; doc: string }[], height: number) => `<!doctype html><meta charset="utf-8">
<style>body{margin:0;display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start}iframe{border:0;height:${height}px}#out{display:none}</style>
<pre id="out"></pre>
<script>
// Registered before the frames: the first ones report while this page is still parsing.
const results = [];
addEventListener("message", (e) => {
  results.push(e.data);
  document.getElementById("out").textContent = JSON.stringify(results);
});
</script>
${frames.map((f) => `<iframe data-key="${f.key}" style="width:${f.width}px" srcdoc="${f.doc.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"></iframe>`).join("\n")}`;

const chrome = async (args: string[]) => {
  const proc = Bun.spawn([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars", `--user-data-dir=${profile}`, ...args], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out;
};

const ids = await exampleIds(DIR, process.argv.slice(2));
// Several runs may share OUT at once (one per writer): each keeps its own harness and profile.
await mkdir(OUT, { recursive: true });
const profile = `${OUT}/profile-${process.pid}`;
let failures = 0;

for (let start = 0; start < ids.length; start += BATCH) {
  const batch = ids.slice(start, start + BATCH);
  const examples = new Map(await Promise.all(batch.map(async (id) => [id, (await readExample(DIR, id))!] as const)));
  /** A frame of the harness: measured with every choice (choice null), or showing one choice for the sheet. */
  const frame = (id: string, width: number, dark: boolean, choice: number | null) => {
    const example = examples.get(id)!;
    const key = `${id} ${width}px ${dark ? "dark" : "light"}`;
    if (choice !== null) return { key, width, doc: standaloneDocument({ ...example, choices: example.choices && [example.choices[choice]] }, id, writtenCss(dark)) };
    const script = `<script>(${probe.toString()})(${JSON.stringify(key)}, ${JSON.stringify(example.choices ?? [])}, ${declarations.toString()});</script>`;
    return { key, width, doc: standaloneDocument(example, id, writtenCss(dark)).replace(/<\/body>/, `${script}</body>`) };
  };

  const page = `${OUT}/harness-${process.pid}.html`;
  await Bun.write(page, harness(batch.flatMap((id) => FRAMES.map((f) => frame(id, f.width, f.dark, null))), MEASURE_HEIGHT));
  const dom = await chrome(["--virtual-time-budget=60000", "--dump-dom", `file://${page}`]);
  const json = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)?.[1] || "[]";
  const results: Result[] = JSON.parse(json.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&"));

  for (const id of batch) {
    const problems = new Set<string>();
    const unsupported = new Set<number>();
    const interactive = new Set<number>();
    const texts = examples.get(id)!.choices ?? [];
    for (const f of FRAMES) {
      const key = `${id} ${f.width}px ${f.dark ? "dark" : "light"}`;
      const r = results.find((r) => r.key === key);
      if (!r) {
        problems.add(`${key}: the frame never reported (its probe threw, or Chrome stopped first)`);
        continue;
      }
      for (const e of r.errors) problems.add(`${key}: ${e}`);
      const supported = r.rows.filter((row) => row.supported);
      for (const row of r.rows) {
        if (!row.supported) unsupported.add(row.choice + 1);
        if (row.overflow > 0) problems.add(`${key}: choice ${row.choice + 1} overflows by ${row.overflow}px`);
        // A rule that only matches on interaction cannot change a still frame: listed, not failed.
        if (row.choice >= 0 && INTERACTIVE.test(texts[row.choice] ?? "")) {
          interactive.add(row.choice + 1);
          continue;
        }
        const twin = supported.find((o) => o.choice < row.choice && row.supported && row.value && o.value === row.value);
        if (twin) problems.add(`${key}: choice ${row.choice + 1} ${twin.choice < 0 ? "changes nothing" : `computes like choice ${twin.choice + 1}`}`);
      }
    }
    failures += problems.size ? 1 : 0;
    const notes = [
      unsupported.size && `not supported by this Chrome: choice ${[...unsupported].join(", ")}`,
      interactive.size && `needs a reader action or print: choice ${[...interactive].join(", ")}`,
    ].filter(Boolean);
    const note = notes.length ? ` (${notes.join("; ")})` : "";
    console.log(`${problems.size ? "✗" : "✓"} ${id}${note}`);
    for (const p of problems) console.log(`    ${p}`);

    const choices = examples.get(id)!.choices?.length ?? 1;
    const shot = `${OUT}/${id}.html`;
    const rows = Array.from({ length: choices }, (_, i) => [frame(id, 330, false, i), frame(id, 330, true, i), frame(id, 600, false, i)]);
    await Bun.write(shot, harness(rows.flat(), SHEET_HEIGHT));
    await chrome([`--window-size=1276,${choices * (SHEET_HEIGHT + 8)}`, `--screenshot=${OUT}/${id}.png`, `file://${shot}`]);
    await rm(shot);
  }
  await rm(page);
}
await rm(profile, { recursive: true, force: true });

console.log(`${ids.length} examples checked, ${failures} failing. Screenshots in ${OUT}/`);
if (failures) process.exit(1);
