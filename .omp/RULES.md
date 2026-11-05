# css-features rules

Hard requirements of this repository, carried on every request and by every subagent.
Layout, commands and reasons are in the root `AGENTS.md`, which subagents do not receive:
read it by path.

- **Quoted, never written.** Feature definitions, syntax, summaries, examples, status, support
  and the Modern CSS list come only from the official sources through `bun run sync`. Never
  hand-edit `data/features.json` or `data/sources.json`, never write a description or an
  example from memory. Fix a wrong value in `scripts/sync.ts`, then re-run the sync. One
  exception is hand-written: the modern showcases in `src/showcases/`, which must use at least
  one reference key of their feature (the build fails otherwise), say inside the frame when the
  browser lacks the feature (`@supports not`), load no external resource, and pass
  `bun run validate` (W3C Nu HTML Checker, HTML errors only) after any change.
- **No em dash** in any UI text or showcase.
- **Full Bun.** `bun add` / `bun install` only, `bun.lock` is the one lockfile.
- **The gate is `bun run check`** (`astro check && astro build`), zero errors, run before
  claiming anything works; a UI change is also checked in a browser.
- **Content English only**, site copy included. Static output only: no server code, no
  analytics, no cookie.
