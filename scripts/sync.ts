/**
 * Download the official sources and write data/features.json and data/sources.json.
 *
 * Sources:
 * - @webref/css (W3C webref): every property, at-rule, selector, function and type the CSS
 *   specifications define, with the definition table and the spec URL.
 * - web-specs (W3C browser-specs): title, series and W3C status of each specification.
 * - MDN content (github.com/mdn/content): summaries and their official examples.
 * - MDN browser-compat-data (npm @mdn/browser-compat-data): status flags, browser support, release dates.
 * - web-features (npm web-features): Baseline status and the named features of the Modern CSS gallery.
 *
 * Run: bun run sync
 */

import { $ } from "bun";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Baseline, Data, Descriptor, Example, Feature, Kind, Modern, Module, Sources } from "../src/data";

const MDN = "https://developer.mozilla.org/en-US/docs/";
const MDN_CSS = "files/en-us/web/css/reference";
const BROWSERS = ["chrome", "edge", "firefox", "safari", "chrome_android", "safari_ios"] as const;
const ENGINES = ["chrome", "firefox", "safari"] as const;
/** A web-features feature is "modern" when it reached Baseline, or an engine first shipped it, in this year or later. */
const MODERN_SINCE = "2023";

// ------------------------------------------------------------------ download

async function get(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { "User-Agent": "css-features-sync" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res;
}

/** Download an npm package tarball and return the parsed JSON of one file inside it. */
async function npmJson(pkg: string, file: string, dir: string): Promise<{ version: string; json: unknown }> {
  const meta: unknown = await (await get(`https://registry.npmjs.org/${pkg}/latest`)).json();
  const tarball = at(meta, ["dist", "tarball"]);
  const version = at(meta, ["version"]);
  if (typeof tarball !== "string" || typeof version !== "string") throw new Error(`npm metadata of ${pkg} has no tarball`);
  const tgz = join(dir, `${pkg.replace(/\W/g, "_")}.tgz`);
  await Bun.write(tgz, await get(tarball));
  const out = join(dir, pkg.replace(/\W/g, "_"));
  await $`mkdir -p ${out} && tar xzf ${tgz} -C ${out}`.quiet();
  return { version, json: await Bun.file(join(out, "package", file)).json() };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Read a nested property of untyped JSON; undefined as soon as a step is not an object. */
function at(value: unknown, path: string[]): unknown {
  for (const key of path) value = isRecord(value) ? value[key] : undefined;
  return value;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ------------------------------------------------------------------ webref

type Raw = Record<string, unknown>;
const WEBREF_KINDS: [string, Kind][] = [
  ["properties", "property"],
  ["atrules", "at-rule"],
  ["selectors", "selector"],
  ["functions", "function"],
  ["types", "type"],
];

/** Feature id: properties keep their name, the other kinds get a prefix so ids never collide. */
function featureId(name: string, kind: Kind): string {
  if (kind === "property") return name === "--*" ? "custom-properties" : name.replace(/^-/, "prefix-");
  const prefix = { "at-rule": "at", selector: "sel", function: "fn", type: "type", property: "" }[kind];
  if (kind === "selector" && !/[a-z]/i.test(name)) {
    const combinators: Record<string, string> = { " ": "descendant", ">": "child", "+": "next-sibling", "~": "subsequent-sibling", "||": "column", "*": "universal" };
    return `sel-${combinators[name] ?? slugify(name) ?? "combinator"}`;
  }
  const base = slugify(name.replace(/^::/, "pseudo-element-").replace(/^:/, "").replace(/^@/, "").replace(/^</, "").replace(/>$/, "").replace(/\(\)$/, ""));
  return `${prefix}-${base}`;
}

function definitionOf(raw: Raw) {
  const keys = ["initial", "appliesTo", "inherited", "percentages", "computedValue", "canonicalOrder", "animationType"] as const;
  if (!keys.some((k) => str(raw[k]))) return null;
  return Object.fromEntries(keys.map((k) => [k, str(raw[k])])) as Feature["definition"];
}

/** Merge the webref entries of one kind by name: a function defined for several scopes becomes one feature. */
function readWebref(webref: unknown): Omit<Feature, "compat" | "mdn" | "status" | "support" | "baseline" | "example" | "modern">[] {
  const out = new Map<string, Omit<Feature, "compat" | "mdn" | "status" | "support" | "baseline" | "example" | "modern">>();
  for (const [key, kind] of WEBREF_KINDS) {
    const list = at(webref, [key]);
    if (!Array.isArray(list)) throw new Error(`webref css.json has no ${key}`);
    for (const raw of list) {
      if (!isRecord(raw) || typeof raw.name !== "string" || typeof raw.href !== "string") continue;
      // webref names types bare ("color"); the spec, MDN and readers write <color>.
      const name = kind === "type" ? `<${raw.name}>` : raw.name;
      let id = featureId(name, kind);
      // Grammar tokens like <(-token> and <)-token> slugify alike; they are dropped later anyway.
      while (kind === "type" && out.has(id) && out.get(id)!.name !== name) id += "-";
      const scope = strs(raw.for);
      const syntax = str(raw.syntax);
      const scopedSyntax = syntax && scope.length ? `/* for ${scope.join(", ")} */\n${syntax}` : syntax;
      const existing = out.get(id);
      if (existing) {
        // ::cue and ::cue() are one feature with two forms: the syntax lists both.
        if (existing.name.replace(/\(\)$/, "") !== name.replace(/\(\)$/, "")) throw new Error(`Feature id "${id}" is shared by ${existing.name} and ${name}`);
        if (scopedSyntax) existing.syntax = [existing.syntax, scopedSyntax].filter(Boolean).join("\n\n");
        existing.for = [...new Set([...existing.for, ...scope])];
        continue;
      }
      const descriptors: Descriptor[] = (Array.isArray(raw.descriptors) ? raw.descriptors : [])
        .filter(isRecord)
        .filter((d) => typeof d.name === "string" && typeof d.href === "string")
        .map((d) => ({ name: d.name as string, href: d.href as string, initial: str(d.initial), syntax: str(d.syntax) }));
      out.set(id, {
        id,
        name,
        kind,
        spec: raw.href,
        extended: strs(raw.extended),
        syntax: scopedSyntax,
        prose: str(raw.prose),
        definition: definitionOf(raw),
        longhands: strs(raw.longhands),
        legacyAliasOf: str(raw.legacyAliasOf),
        descriptors,
        for: scope,
      });
    }
  }
  return [...out.values()];
}

// ------------------------------------------------------------------ web-specs

type Spec = { title: string; series: string; nightly: string; release: Module["release"]; urls: string[] };

function readSpecs(index: unknown): Spec[] {
  if (!Array.isArray(index)) throw new Error("web-specs index is not an array");
  const out: Spec[] = [];
  for (const s of index) {
    if (!isRecord(s)) continue;
    const series = at(s, ["series", "shortname"]);
    const title = at(s, ["series", "title"]);
    const nightly = at(s, ["series", "nightlyUrl"]) ?? at(s, ["nightly", "url"]);
    if (typeof series !== "string" || typeof title !== "string" || typeof nightly !== "string") continue;
    const releaseUrl = at(s, ["release", "url"]);
    const releaseStatus = at(s, ["release", "status"]);
    out.push({
      title,
      series,
      nightly,
      release: typeof releaseUrl === "string" && typeof releaseStatus === "string" ? { url: releaseUrl, status: releaseStatus } : null,
      urls: [str(at(s, ["nightly", "url"])), ...strs(at(s, ["nightly", "alternateUrls"]))].filter((u): u is string => !!u),
    });
  }
  return out;
}

/** The spec whose nightly URL is the longest prefix of the feature's definition URL. */
function specFor(specs: Spec[], href: string): Spec {
  const base = href.split("#")[0];
  let best: { spec: Spec; length: number } | null = null;
  for (const spec of specs) {
    for (const u of spec.urls) {
      if (base.startsWith(u) && (!best || u.length > best.length)) best = { spec, length: u.length };
    }
  }
  if (!best) throw new Error(`No specification in web-specs for ${href}`);
  return best.spec;
}

// ------------------------------------------------------------------ MDN

type MdnPage = { slug: string; name: string; compat: string | null; summary: string; example: Example | null };

/** Links to MDN pages by feature name (cssxref macro), filled once the pages are read. */
let mdnByName = new Map<string, string>();

/** The subset of MDN markdown and macros used in summaries, to HTML. */
function mdInline(src: string): string {
  const slots: string[] = [];
  const keep = (fragment: string) => `\u0000${slots.push(fragment) - 1}\u0000`;
  const code = (s: string) => `<code>${escape(s.replace(/&lt;/g, "<").replace(/&gt;/g, ">"))}</code>`;

  let s = src.replace(/\{\{\s*(\w+)\s*\((.*?)\)\s*\}\}/g, (_, name: string, rawArgs: string) => {
    const args = [...rawArgs.matchAll(/"([^"]*)"/g)].map((a) => a[1]);
    const macro = name.toLowerCase();
    if (!args.length) return "";
    if (macro === "cssxref") {
      const target = args[0].replace(/&lt;/g, "<").replace(/&gt;/g, ">");
      const label = code(args.length > 1 ? args[1] : args[0]);
      const url = mdnByName.get(target) ?? mdnByName.get(`<${target}>`) ?? mdnByName.get(`${target}()`);
      return keep(url ? `<a href="${escape(url)}">${label}</a>` : label);
    }
    if (macro === "htmlelement") {
      const tag = args[0].toLowerCase();
      return keep(`<a href="${MDN}Web/HTML/Reference/Elements/${tag}"><code>&lt;${escape(tag)}&gt;</code></a>`);
    }
    if (macro === "glossary") {
      return keep(`<a href="${MDN}Glossary/${args[0].replace(/ /g, "_")}">${escape(args.at(-1)!)}</a>`);
    }
    return keep(code(args[0]));
  });
  s = s.replace(/\{\{[^}]*\}\}/g, "");
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) => {
    if (url.startsWith("/")) url = "https://developer.mozilla.org" + url;
    return keep(`<a href="${escape(url)}">${mdInline(label)}</a>`);
  });
  s = s.replace(/`([^`]+)`/g, (_, c: string) => keep(code(c)));
  s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(?<!\w)_(.+?)_(?!\w)/g, "<em>$1</em>");
  while (s.includes("\u0000")) s = s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => slots[Number(i)]);
  return s.replace(/\s+/g, " ").trim();
}

// Root-relative MDN asset paths only resolve on developer.mozilla.org.
const ASSETS = /(?<=["'(\s,])\/shared-assets\//g;

/** The page's interactive example (with its value choices), else the first example of its Examples section. */
function mdnExample(body: string): Example | null {
  const fence = /^```(\w+)([^\n]*)\n([\s\S]*?)^```/gm;
  const all = [...body.matchAll(fence)];
  let blocks = all.filter((m) => / interactive-example(?![\w-])/.test(m[2])).map((m) => [m[1], m[3]]);
  const choices = all.filter((m) => m[2].includes("interactive-example-choice")).map((m) => m[3].trim());
  if (!blocks.length && body.includes("\n## Examples")) {
    const section = body.split("\n## Examples")[1].split("\n## ")[0];
    for (const chunk of section.split("\n### ")) {
      const found = [...chunk.matchAll(fence)].map((m) => [m[1], m[3]]);
      if (found.some(([lang]) => lang === "html") && found.some(([lang]) => lang === "css")) {
        blocks = found;
        break;
      }
    }
  }
  const out: Partial<Record<"html" | "css" | "js", string>> = {};
  for (const [lang, code] of blocks) {
    if (lang !== "html" && lang !== "css" && lang !== "js") continue;
    out[lang] = [out[lang], code.trim()].filter(Boolean).join("\n\n").replace(ASSETS, "https://developer.mozilla.org/shared-assets/");
  }
  return out.html ? { html: out.html, css: out.css ?? null, js: out.js ?? null, choices: choices.length ? choices : null } : null;
}

/** Every page of MDN's CSS reference, indexed by browser-compat key and by feature name. */
async function readMdn(root: string): Promise<{ byCompat: Map<string, MdnPage>; byName: Map<string, MdnPage> }> {
  const byCompat = new Map<string, MdnPage>();
  const byName = new Map<string, MdnPage>();
  const pages: { front: string; body: string }[] = [];
  // Pages nest (values/gradient/linear-gradient, values/color_value/rgb): walk the whole reference.
  for (const entry of await readdir(join(root, MDN_CSS), { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || entry.name !== "index.md" || entry.parentPath === join(root, MDN_CSS)) continue;
    const [, front, ...rest] = (await Bun.file(join(entry.parentPath, entry.name)).text()).split("---");
    pages.push({ front, body: rest.join("---") });
  }
  // Names first, so the cssxref links of summaries can resolve to any page.
  const meta = pages.map(({ front }) => {
    const slug = front.match(/^slug: (.+)$/m)![1].trim();
    const short = front.match(/^short-title: (.+)$/m)?.[1] ?? front.match(/^title: "?`([^`]+)`/m)?.[1] ?? front.match(/^title: (.+)$/m)![1];
    const name = short.trim().replace(/^"|"$/g, "");
    const compat = front.match(/^browser-compat:\s*(\S+)$/m)?.[1] ?? front.match(/^browser-compat:\s*\n\s+- (\S+)/m)?.[1] ?? null;
    return { slug, name, compat };
  });
  mdnByName = new Map(meta.map((m) => [m.name, MDN + m.slug]));
  pages.forEach(({ body }, i) => {
    const { slug, name, compat } = meta[i];
    const paragraph = body.trim().split("\n\n").find((p) => p.trim() && !/^\s*(\{\{|#|>|```|<)/.test(p));
    const page: MdnPage = { slug, name, compat, summary: paragraph ? mdInline(paragraph) : "", example: mdnExample(body) };
    if (compat && !byCompat.has(compat)) byCompat.set(compat, page);
    if (!byName.has(name)) byName.set(name, page);
  });
  return { byCompat, byName };
}

// ------------------------------------------------------------------ BCD and web-features

type Compat = { status: Feature["status"]; support: Record<string, string> };

function readCompat(bcd: unknown, key: string): Compat | null {
  const c = at(bcd, [...key.split("."), "__compat"]);
  if (!isRecord(c)) return null;
  return {
    status: {
      deprecated: at(c, ["status", "deprecated"]) === true,
      experimental: at(c, ["status", "experimental"]) === true,
      standardTrack: at(c, ["status", "standard_track"]) !== false,
    },
    support: Object.fromEntries(BROWSERS.map((b) => [b, supportLabel(at(c, ["support", b]))])),
  };
}

/** BCD support statement -> first version with support; the first statement is the main one. */
function supportLabel(statement: unknown): string {
  const first: unknown = Array.isArray(statement) ? statement[0] : statement;
  if (!isRecord(first)) return "?";
  const added = first.version_added;
  let label = added === true ? "Yes" : added === false ? "No" : added === "preview" ? "Preview" : typeof added === "string" ? added : "?";
  if (first.flags) label += " (flag)";
  if (typeof first.prefix === "string") label += ` (${first.prefix} prefix)`;
  if (typeof first.version_removed === "string") label += `, removed in ${first.version_removed}`;
  return label;
}

/** The BCD namespace of each kind whose keys never cross into another (functions and types do). */
const COMPAT_NAMESPACE: Partial<Record<Kind, string>> = {
  property: "css.properties.",
  "at-rule": "css.at-rules.",
  selector: "css.selectors.",
};

/** The BCD key a webref feature most likely maps to, when MDN does not name it. */
function guessCompat(bcd: unknown, name: string, kind: Kind): string | null {
  const bare = name.replace(/^::?/, "").replace(/^@/, "").replace(/^</, "").replace(/>$/, "").replace(/\(\)$/, "");
  const candidates = {
    property: [`css.properties.${name === "--*" ? "custom-property" : name}`],
    "at-rule": [`css.at-rules.${bare}`],
    selector: [`css.selectors.${bare}`],
    function: [`css.types.${bare}`, `css.types.color.${bare}`, `css.types.image.gradient.${bare}`, `css.types.basic-shape.${bare}`],
    type: [`css.types.${bare}`],
  }[kind];
  return candidates.find((k) => isRecord(at(bcd, [...k.split("."), "__compat"]))) ?? null;
}

/** BCD compat key -> Baseline status of the web-features feature that contains it.
 *  Discouraged features are skipped: web-features says to show their discouraged status instead. */
function baselineIndex(features: unknown): Map<string, Baseline> {
  if (!isRecord(features)) throw new Error("web-features data has no features object");
  const out = new Map<string, Baseline>();
  for (const [id, f] of Object.entries(features)) {
    if (!isRecord(f) || f.kind !== "feature" || f.discouraged) continue;
    const status = f.status;
    if (!isRecord(status)) continue;
    const level = status.baseline;
    if (level !== "high" && level !== "low" && level !== false) continue;
    for (const key of strs(f.compat_features)) {
      out.set(key, { feature: id, status: level, lowDate: str(status.baseline_low_date), highDate: str(status.baseline_high_date) });
    }
  }
  return out;
}

/** Release date of a browser version, from BCD's browsers data. */
function releaseDate(bcd: unknown, browser: string, version: string): string | null {
  return str(at(bcd, ["browsers", browser, "releases", version.replace(/^≤/, ""), "release_date"]));
}

/** The Modern CSS gallery: web-features features of the CSS platform that moved in MODERN_SINCE or later. */
function readModern(features: unknown, groups: unknown, bcd: unknown, compatToId: Map<string, string>, exampleIds: Set<string>): Modern[] {
  if (!isRecord(features) || !isRecord(groups)) throw new Error("web-features data has no features or groups");
  const groupName = (id: string) => str(at(groups, [id, "name"]));
  const underCss = (id: string | null): boolean => id === "css" || (!!id && underCss(str(at(groups, [id, "parent"]))));
  const out: Modern[] = [];
  for (const [id, f] of Object.entries(features)) {
    if (!isRecord(f) || f.kind !== "feature" || f.discouraged) continue;
    const compat = strs(f.compat_features);
    // A CSS feature: filed under the CSS group tree, or naming at least one CSS compat key.
    if (!strs(f.group).concat(str(f.group) ?? []).some(underCss) && !compat.some((k) => k.startsWith("css."))) continue;
    const status = f.status;
    if (!isRecord(status)) continue;
    const level = status.baseline;
    if (level !== "high" && level !== "low" && level !== false) continue;
    const lowDate = str(status.baseline_low_date);
    let since: string | null = null;
    if (level) {
      if (lowDate && lowDate.replace(/^≤/, "") >= MODERN_SINCE) since = lowDate.replace(/^≤/, "");
    } else {
      // Still limited: the newest date an engine first shipped one of the feature's keys.
      const byKey = at(status, ["by_compat_key"]);
      let newest = "";
      for (const entry of isRecord(byKey) ? Object.values(byKey) : []) {
        for (const engine of ENGINES) {
          const version = str(at(entry, ["support", engine]));
          const date = version && releaseDate(bcd, engine, version);
          if (date && date > newest) newest = date;
        }
      }
      if (newest >= MODERN_SINCE) since = newest;
    }
    if (!since) continue;
    const group = strs(f.group)[0] ?? str(f.group);
    // css.properties.text-wrap.balance belongs to the text-wrap entry: climb until a reference feature owns the key.
    const owner = (key: string): string | null => {
      for (let parts = key.split("."); parts.length >= 3; parts.pop()) {
        const id = compatToId.get(parts.join("."));
        if (id) return id;
      }
      return null;
    };
    const keys = [...new Set(compat.filter((k) => k.startsWith("css.")).map(owner).filter((k): k is string => !!k))];
    const supportRaw = at(status, ["support"]);
    const support = Object.fromEntries(BROWSERS.map((b) => [b, str(at(supportRaw, [b])) ?? "No"]));
    out.push({
      id,
      name: str(f.name) ?? id,
      description: str(f.description_html) ?? str(f.description) ?? "",
      group: group ? groupName(group) : null,
      spec: strs(f.spec).length ? strs(f.spec) : typeof f.spec === "string" ? [f.spec] : [],
      status: level,
      lowDate,
      highDate: str(status.baseline_high_date),
      since,
      support,
      keys,
      exampleOf: keys.find((k) => exampleIds.has(k)) ?? null,
    });
  }
  return out.sort((a, b) => b.since.localeCompare(a.since) || a.name.localeCompare(b.name));
}

// ------------------------------------------------------------------ assembly

async function main() {
  const dir = await mkdtemp(join(tmpdir(), "css-features-"));
  try {
    const mdnRoot = join(dir, "mdn-content");
    const [webref, webSpecs, bcd, webFeatures] = await Promise.all([
      npmJson("@webref/css", "css.json", dir),
      npmJson("web-specs", "index.json", dir),
      npmJson("@mdn/browser-compat-data", "data.json", dir),
      npmJson("web-features", "data.json", dir),
      (async () => {
        await $`git clone -q --depth 1 --filter=blob:none --sparse https://github.com/mdn/content ${mdnRoot}`;
        await $`git -C ${mdnRoot} sparse-checkout set ${MDN_CSS}`;
      })(),
    ]);
    const mdn = await readMdn(mdnRoot);
    const specs = readSpecs(webSpecs.json);
    const baseline = baselineIndex(at(webFeatures.json, ["features"]));

    const modules = new Map<string, Module>();
    const compatToId = new Map<string, string>();
    const features: Feature[] = [];
    for (const row of readWebref(webref.json)) {
      // MDN names collide across kinds (the width property and the width media feature, the
      // font-family property and descriptor): a page found by name only counts when its compat key
      // is of this kind. Functions and types are left alone, their pages point at property values.
      const named = mdn.byName.get(row.name) ?? null;
      const ownKind = COMPAT_NAMESPACE[row.kind];
      const page = named && (!ownKind || !named.compat || named.compat.startsWith(ownKind)) ? named : null;
      const compat = page?.compat ?? guessCompat(bcd.json, row.name, row.kind);
      // Grammar productions nobody documents (<]-token>...) stay out: a type needs an MDN page or a BCD entry.
      if (row.kind === "type" && !page && !compat) continue;
      const c = compat ? readCompat(bcd.json, compat) : null;
      const mdnPage = page ?? (compat ? (mdn.byCompat.get(compat) ?? null) : null);
      const feature: Feature = {
        ...row,
        compat,
        mdn: mdnPage && { url: MDN + mdnPage.slug, summary: mdnPage.summary },
        status: c?.status ?? { deprecated: false, experimental: false, standardTrack: true },
        support: c?.support ?? null,
        baseline: (compat && baseline.get(compat)) || null,
        example: mdnPage?.example ?? null,
        modern: [],
      };
      if (compat && !compatToId.has(compat)) compatToId.set(compat, feature.id);
      const spec = specFor(specs, row.spec);
      const slug = slugify(spec.series);
      if (!modules.has(slug)) modules.set(slug, { slug, series: spec.series, title: spec.title, spec: spec.nightly, release: spec.release, features: [] });
      modules.get(slug)!.features.push(feature);
      features.push(feature);
    }

    const exampleIds = new Set(features.filter((f) => f.example).map((f) => f.id));
    const modern = readModern(at(webFeatures.json, ["features"]), at(webFeatures.json, ["groups"]), bcd.json, compatToId, exampleIds);
    const byId = new Map(features.map((f) => [f.id, f]));
    for (const m of modern) for (const key of m.keys) byId.get(key)!.modern.push(m.id);

    const kindRank: Record<Kind, number> = { property: 0, "at-rule": 1, selector: 2, function: 3, type: 4 };
    for (const m of modules.values()) m.features.sort((a, b) => kindRank[a.kind] - kindRank[b.kind] || a.name.localeCompare(b.name));
    const sortTitle = (m: Module) => m.title.replace(/^CSS /, "");
    const sorted = [...modules.values()].sort((a, b) => sortTitle(a).localeCompare(sortTitle(b)));

    const data: Data = { modules: sorted, modern, modernSince: MODERN_SINCE };
    const mdnCommit = (await $`git -C ${mdnRoot} log -1 --format=%cs\ %h`.text()).trim();
    const sources: Sources = { webref: webref.version, webSpecs: webSpecs.version, mdn: mdnCommit, bcd: bcd.version, webFeatures: webFeatures.version };
    await Bun.write("data/features.json", JSON.stringify(data, null, 1) + "\n");
    await Bun.write("data/sources.json", JSON.stringify(sources, null, 2) + "\n");

    const count = (kind: Kind) => features.filter((f) => f.kind === kind).length;
    console.log(
      `data/features.json: ${features.length} features (${count("property")} properties, ${count("at-rule")} at-rules, ${count("selector")} selectors, ` +
        `${count("function")} functions, ${count("type")} types), ${sorted.length} modules, ${exampleIds.size} examples, ` +
        `${features.filter((f) => f.baseline).length} with Baseline, ${modern.length} modern features (${modern.filter((m) => m.exampleOf).length} with an MDN example)`,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

await main();
