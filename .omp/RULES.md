# css-features rules

Hard requirements of this repository, carried on every request and by every subagent.
Layout, commands and reasons are in the root `AGENTS.md`, which subagents do not receive:
read it by path.

- **Quoted, never written.** Feature definitions, syntax, summaries, examples, status, support
  and the Modern CSS list come only from the official sources through `vp run sync`. Never
  hand-edit `data/features.json` or `data/sources.json`, never write a description or an
  example from memory. Fix a wrong value in `scripts/sync.ts`, then re-run the sync. Two
  exceptions are hand-written, and both load no external resource and pass `vp run validate`
  (W3C Nu HTML Checker, HTML errors only; the `interestfor` attribute, still an open HTML pull
  request, is the one tolerated error) after any change:
  - the modern showcases in `src/showcases/`, which must use at least one reference key of their
    feature (the build fails otherwise) and say inside the frame when the browser lacks the
    feature (`@supports not`);
  - the reference examples in `src/examples/<feature id>.{html,css,txt}`, which replace the MDN
    example of a feature. The demonstrated element is `#example-element`; `.txt` holds 3 to 6
    value choices (2 when only two values look different), one per blank-line separated paragraph: declarations applied inline to
    `#example-element` (extra declarations allowed when the value needs them to show), or, for
    selectors and at-rules, a whole rule block (contains `{`). Choices show real, current usage
    and stay even when Chromium lacks them (the page marks them). Use the skin of
    `src/standalone-document.ts` (`--ink --muted --stage --card --line --a1..--a5 --grad`,
    `.card`, `.tile`), never hard-coded white or black text or backgrounds outside it: the
    preview follows the light and dark themes. Fit a 330 px wide frame. Images are CSS gradients
    or inline SVG. Check syntax and values against `data/features.json` and BCD, never from
    memory. Each example passes `vp run check-examples <id>` (headless Chrome) after any change.
- **No em dash** in any UI text, showcase or example.
- **Vite+, Bun underneath.** `vp add` / `vp install` only, `bun.lock` the one lockfile.
- **The gate is `vp run gate`** (`astro check && vp check && astro build`), zero errors, run before
  claiming anything works; a UI change is also checked in a browser.
- **Content English only**, site copy included. Static output only: no server code, no
  analytics, no cookie.
