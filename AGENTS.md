# css-features

Static site at `https://css.charmaweb.com`: every CSS property, at-rule, selector, function
and type the W3C specifications define, with a live editable example, its definition table,
syntax, browser support and Baseline status, plus a Modern CSS gallery of the features that
moved recently, each one illustrated live. Astro 7, TypeScript, Bun, hand-written CSS. Sibling
of `~/Bureau/html` (`Karlito8888/html-elements`), same mechanics. Remote
`Karlito8888/css-features`, branch `main`.

## Commands

```bash
bun run sync             # download the sources, rewrite data/features.json and data/sources.json
bun run validate [id...] # send every showcase and reference example (or the named ones) to the W3C Nu HTML Checker (network; run by hand, not in CI; CHECKER=http://localhost:8888/?out=json targets a local vnu.jar)
bun run check-examples [id...] # headless Chrome check of the reference examples, contact sheets in /tmp/css-examples-check/ (EXAMPLES_DIR=<folder> checks drafts outside the repo)
bun scripts/preview.ts <id>   # a showcase or reference example as a standalone document in /tmp, to open in a browser
bun run dev              # http://localhost:4341
bun run check            # the gate: astro check && astro build
bun run preview          # serve dist/ on 4341 (daemonized: `bunx astro preview stop`)
```

## Data

`scripts/sync.ts` is the only writer of `data/`. It reads, from npm tarballs or a sparse clone:

| Source | Used for |
|---|---|
| `@webref/css` (W3C webref, scraped from the specs) | every feature with its name, spec URL, syntax, prose, property definition table (initial, applies to, inherited, percentages, computed value, canonical order, animation type), longhands, legacy aliases, at-rule descriptors, `for` scopes |
| `web-specs` (W3C browser-specs) | the module a feature belongs to: series shortname, title, Editor's Draft URL, W3C release status |
| `github.com/mdn/content` (sparse clone of `files/en-us/web/css/reference`) | MDN summary (first paragraph) and example: the `interactive-example` fences with their `interactive-example-choice` value blocks, else the first `## Examples` subsection with HTML and CSS |
| npm `@mdn/browser-compat-data` | deprecated / experimental / standard-track flags, first supported version, browser release dates |
| npm `web-features` | Baseline status of each feature, and the named features of the Modern CSS gallery (name, description, group, spec, support, compat keys) |

Rules the sync applies:

- A module is a spec series (`css-grid`, `css-anchor-position`): 89 of them, sorted by title.
  Every feature webref lists is kept, except types without an MDN page or a BCD entry (grammar
  productions such as `<]-token>`). Entries without a BCD key are badged "Not in any browser yet",
  except legacy aliases (`-webkit-align-items`...), which browsers ship but BCD files under the
  standard name (`shipped` in `src/data.ts`).
- Feature ids: properties keep their name (`--*` is `custom-properties`, a leading `-` becomes
  `prefix-`), the other kinds get a prefix (`at-container`, `sel-has`, `sel-pseudo-element-before`,
  `fn-calc`, `type-color`). A function defined for several scopes, or a selector with a functional
  form (`::cue` and `::cue()`), is one feature whose syntax lists each form.
- MDN pages are matched by name (`short-title` or the first code span of the title), else by
  the BCD key the sync guesses from the name. Names collide across kinds (the `width` property and
  media feature, the `font-family` property and descriptor), so for properties, at-rules and
  selectors a page matched by name counts only when its BCD key is of that kind. `cssxref` macros
  in summaries link to the MDN page of the named feature when it exists.
- **Modern CSS** (`data.modern`): a web-features feature that is filed under the CSS group tree
  or names at least one `css.*` compat key, is not discouraged, and either reached Baseline
  (`baseline_low_date`) in `MODERN_SINCE` (2023) or later, or is still limited but had an engine
  first ship one of its keys in that period (BCD release dates). `since` is that date and sorts
  the gallery. `keys` are the reference features its compat keys name (a value-level key such as
  `css.properties.text-wrap.balance` maps to `text-wrap`); `exampleOf` is the first key with an
  MDN example, shown when no showcase is written.

`src/data.ts` holds the types both sides share. `data/sources.json` changes on almost every run
(package versions, MDN commit); the weekly workflow opens a pull request only when
`data/features.json` changes.

## Layout

- `src/pages/index.astro` home (Modern CSS front row, kinds, modules), `modern.astro` the gallery
  (`/modern/`, three groups: newly available, cutting edge, widely available since 2023),
  `[module].astro` one page per spec series, `all-[kind].astro` the A to Z index of each kind
  (`/all-properties/` ...), `404.astro`, `search.json.ts` the search index (modern features,
  features, modules).
- `src/components/FeatureBlock.astro` one feature; `Example.astro` preview plus Shiki code tabs
  (CSS first) and, for examples with value choices, a row of radio buttons; `Search.astro`
  combobox over `/search.json` (names compared without `:`, `@`, `<>` and `()`);
  `ThemeToggle.astro`; `ModuleNav.astro` sidebar.
- `src/scripts/examples.ts` previews: sandboxed `srcdoc` iframes (no `allow-same-origin`)
  mounted when near the viewport, sized by a `postMessage` tagged with the example id. MDN
  examples get the base styles of MDN's own play runner (`mdn/dex`,
  `cloud-function/src/internal/play`): a 300 px centered stage for choice examples, a plain
  document otherwise. A choice is applied through a `MessagePort`: declarations as inline style
  on `#example-element`, a choice holding `{` as the content of a style element; choices this
  browser cannot parse (`CSS.supports`, or a rule the parser drops) are marked.
  `src/standalone-document.ts` holds the showcase and written-example skins and builds the
  standalone documents the scripts use (`scripts/example-files.ts` reads both folders).
  `src/scripts/editor.ts` CodeMirror, imported only on "Edit" (about 190 KB gzipped).

## Modern showcases

A hand-written demo per headline feature of the gallery: `src/showcases/<web-features id>.html`,
plus optional `.css` and `.js`, loaded by `src/showcases.ts`. The build fails when a showcase uses
none of its feature's reference keys (`keyPattern`: `name:` for a property, `@name`, the selector
text, `name(` for a function); the keys it uses are solid chips under the demo, the others dashed.
Every showcase says inside the frame, through `@supports not (...)`, when the browser lacks the
feature. `bun run validate` checks their HTML with the Nu checker; its CSS messages are printed
and tolerated, since the checker's CSS parser lags behind modern CSS. Features without a showcase
show the reference example of their first key that has a written one, else the MDN example of
their first documented key.

## Reference examples

Examples written for this site replace the MDN example of a feature: `src/examples/<feature id>.html`
(the demonstrated element is `#example-element`), optional `.css`, optional `.txt` with the value
choices (one per blank-line separated paragraph), loaded by `src/examples.ts`. They render on a
shared skin (`src/standalone-document.ts`) that follows the site theme through `light-dark()`,
and their bar says "Written for this site". The build fails when an example never writes its
feature (`keyPattern`). A feature without one keeps its MDN example. The contract they obey is
in `.omp/RULES.md`; `bun run check-examples` proves it in headless Chrome at 330 and 900 px,
light and dark: no page error, no horizontal overflow, every supported choice changes the
computed style (declared properties, or for rule blocks every element against no choice). Rule
blocks whose selector cannot match a still frame (`:hover`, `:focus`, `::selection`, media
states, `@page`...) are listed rather than failed, and their example says in the frame what to do.

## Deployment

Cloudflare Worker `css-features` (static assets, `wrangler.jsonc`) in the `charmaweb11@gmail.com`
account, custom domain `css.charmaweb.com`, deployed by `.github/workflows/deploy.yml` on every
push to `main` (secret `CLOUDFLARE_API_TOKEN`, variable `CLOUDFLARE_ACCOUNT_ID`, same setup as
html-elements). `.github/workflows/sync.yml` runs the sync every Monday and opens a pull request.

## Licences

Code MIT (`LICENSE`). Content quotes the W3C CSS specifications (© W3C, W3C Software and Document
License) through webref and browser-specs (MIT), MDN prose (CC BY-SA 2.5), MDN code examples and
browser-compat-data (CC0), web-features (Apache 2.0); the site content is therefore CC BY-SA 2.5,
credited in the footer.
