// Shape of data/features.json, written by scripts/sync.ts from the official sources.
// HTML strings (summary, description...) are sanitized by the sync: only <a href>, <code>, <i>, <strong>, <em>.

import featuresJson from "../data/features.json";
import sourcesJson from "../data/sources.json";

export type Kind = "property" | "at-rule" | "selector" | "function" | "type";

export type Baseline = { feature: string; status: "high" | "low" | false; lowDate: string | null; highDate: string | null };

/** html, css and js come from MDN; choices are the "interactive-example-choice" blocks, declarations applied to #example-element. */
export type Example = { html: string; css: string | null; js: string | null; choices: string[] | null };

/** The CSS property definition table, as the spec writes it (webref). */
export type Definition = {
  initial: string | null;
  appliesTo: string | null;
  inherited: string | null;
  percentages: string | null;
  computedValue: string | null;
  canonicalOrder: string | null;
  animationType: string | null;
};

export type Descriptor = { name: string; href: string; initial: string | null; syntax: string | null };

export type Feature = {
  id: string;
  name: string;
  kind: Kind;
  spec: string;
  extended: string[];
  syntax: string | null;
  prose: string | null;
  definition: Definition | null;
  longhands: string[];
  legacyAliasOf: string | null;
  descriptors: Descriptor[];
  for: string[];
  compat: string | null;
  mdn: { url: string; summary: string } | null;
  status: { deprecated: boolean; experimental: boolean; standardTrack: boolean };
  support: Record<string, string> | null;
  baseline: Baseline | null;
  example: Example | null;
  /** ids of the modern features (data.modern) whose compat keys include this feature */
  modern: string[];
};

export type Module = {
  slug: string;
  series: string;
  title: string;
  spec: string;
  release: { url: string; status: string } | null;
  features: Feature[];
};

/** A web-features feature of the CSS group that reached Baseline, or shipped in an engine, in MODERN_SINCE or later. */
export type Modern = {
  id: string;
  name: string;
  description: string;
  group: string | null;
  spec: string[];
  status: "high" | "low" | false;
  lowDate: string | null;
  highDate: string | null;
  /** the date the gallery sorts by: Baseline low date, else the newest first-ship date across engines */
  since: string;
  support: Record<string, string>;
  /** ids of the reference features (data.modules[].features[]) the feature's compat keys name */
  keys: string[];
  /** id of the reference feature whose MDN example illustrates it when no showcase is written */
  exampleOf: string | null;
};

export type Data = { modules: Module[]; modern: Modern[]; modernSince: string };

export type Sources = { webref: string; webSpecs: string; mdn: string; bcd: string; webFeatures: string };

// The JSON is produced by our own sync script against these types.
export const data = featuresJson as Data;
export const sources: Sources = sourcesJson;

export const BROWSERS: Record<string, string> = {
  chrome: "Chrome",
  edge: "Edge",
  firefox: "Firefox",
  safari: "Safari",
  chrome_android: "Chrome Android",
  safari_ios: "Safari iOS",
};

export const KINDS: Record<Kind, { title: string; plural: string }> = {
  property: { title: "Property", plural: "Properties" },
  "at-rule": { title: "At-rule", plural: "At-rules" },
  selector: { title: "Selector", plural: "Selectors" },
  function: { title: "Function", plural: "Functions" },
  type: { title: "Type", plural: "Types" },
};

export const allFeatures = data.modules.flatMap((m) => m.features);
export const featureCount = allFeatures.length;

export const moduleUrl = (m: Module) => `/${m.slug}/`;

const featureModule = new Map(data.modules.flatMap((m) => m.features.map((f) => [f.id, m] as const)));
export const featureUrl = (f: Feature) => `${moduleUrl(featureModule.get(f.id)!)}#${f.id}`;
export const featureById = new Map(allFeatures.map((f) => [f.id, f]));

/** Known to at least one browser: a BCD entry, or a legacy alias (kept by the spec because browsers ship it, though BCD files it under the standard name). */
export const shipped = (f: Feature) => !!f.compat || !!f.legacyAliasOf;
