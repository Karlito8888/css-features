import type { Example } from "./data";

// Base stylesheets of the previews, shared by the page (src/scripts/examples.ts) and by the
// standalone documents the scripts build (validate, preview, check-examples).

/** Modern showcases: a neutral page. */
export const SHOWCASE_CSS =
  "body{margin:16px;font-family:system-ui,sans-serif;color:#1b1b1b;background:#fff}";

// Reference examples written for this site: a stage that follows the site theme, a palette and
// a few shared classes (.tile, .card) so each example only writes what its feature needs.
const WRITTEN_CSS = `:root{--ink:light-dark(#0f172a,#e6e8ee);--muted:light-dark(#596275,#98a1b3);--stage:light-dark(#f4f6fb,#0d1017);--card:light-dark(#fff,#161b26);--line:light-dark(#dde2ec,#2a3242);--a1:#6366f1;--a2:#ec4899;--a3:#06b6d4;--a4:#f59e0b;--a5:#10b981;--grad:linear-gradient(135deg,var(--a1),var(--a2))}
*{box-sizing:border-box}
body{margin:0;min-height:320px;display:grid;place-items:center;padding:28px;font:500 16px/1.5 Inter,system-ui,sans-serif;color:var(--ink);background:radial-gradient(60% 80% at 15% 0%,color-mix(in oklab,var(--a1) 16%,transparent),transparent),radial-gradient(50% 70% at 100% 100%,color-mix(in oklab,var(--a2) 14%,transparent),transparent),var(--stage)}
#example-element{transition:all .4s cubic-bezier(.2,.8,.2,1)}
.card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:22px 26px;box-shadow:0 18px 40px -24px rgb(15 23 42/.45)}
.tile{display:grid;place-items:center;min-height:72px;border-radius:14px;color:#fff;font-weight:700;background:var(--grad);box-shadow:0 8px 22px -10px color-mix(in oklab,var(--a1) 70%,transparent)}
.tile:nth-child(4n+2){--grad:linear-gradient(135deg,var(--a3),var(--a1))}
.tile:nth-child(4n+3){--grad:linear-gradient(135deg,var(--a4),var(--a2))}
.tile:nth-child(4n+4){--grad:linear-gradient(135deg,var(--a5),var(--a3))}`;

/** The skin of a written example, in the light or dark theme. */
export const writtenCss = (dark: boolean) =>
  `:root{color-scheme:${dark ? "dark" : "light"}}${WRITTEN_CSS}`;

/** The value choices of a written example (its .txt): one block per blank-line separated paragraph. */
export const splitChoices = (text: string) => text.split(/\n\s*\n/);

/**
 * The declarations of a value choice: split on the ";" that end them, not on those inside
 * parentheses or strings (`if(style(--x: 1): a; else: b)`, `content: ";"`). Serialized with
 * toString() into the preview frames, so it must stay self-contained.
 */
export function declarations(code: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  code = code.replace(/\/\*[\s\S]*?\*\//g, "");
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = "";
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === ";" && depth === 0) {
      out.push(code.slice(start, i));
      start = i + 1;
    }
  }
  out.push(code.slice(start));
  return out.map((d) => d.trim()).filter(Boolean);
}

/**
 * The complete document an example becomes, with its first value choice applied as the page does
 * (declarations inline on #example-element, a choice holding "{" as a style element).
 */
export function standaloneDocument(
  { html, css, js, choices }: Example,
  title: string,
  base: string,
): string {
  if (/<html[\s>]/i.test(html)) {
    if (css || js)
      throw new Error("A full-document example keeps its CSS and JS inside its own HTML");
    return html;
  }
  const first = choices?.[0];
  const choiceStyle = first?.includes("{") ? `<style data-choice>${first}</style>` : "";
  if (first && !choiceStyle)
    html = html.replace(
      'id="example-element"',
      `$& style="${first.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`,
    );
  const script = js ? `<script>${js}</script>` : "";
  const body = /<body[\s>]/i.test(html)
    ? html.replace(/<\/body>/i, `${script}</body>`)
    : `<body>${html}${script}</body>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>${base}</style>${css ? `<style>${css}</style>` : ""}${choiceStyle}</head>${body}</html>`;
}
