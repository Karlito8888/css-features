import type { Example } from "./data";

/** The complete document a showcase becomes: what `bun run validate` and `bun run preview-showcase` use. */
export function showcaseDocument({ html, css, js }: Example, title = "Showcase"): string {
  if (/<html[\s>]/i.test(html)) {
    if (css || js) throw new Error("A full-document showcase keeps its CSS and JS inside its own HTML");
    return html;
  }
  const script = js ? `<script>${js}</script>` : "";
  const body = /<body[\s>]/i.test(html) ? html.replace(/<\/body>/i, `${script}</body>`) : `<body>${html}${script}</body>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{margin:16px;font-family:system-ui,sans-serif;color:#1b1b1b;background:#fff}</style>${css ? `<style>${css}</style>` : ""}</head>${body}</html>`;
}
