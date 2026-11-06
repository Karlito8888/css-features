import type { Editor } from "./editor";
import { isDark, onThemeChange } from "./theme";

// Live examples: each preview is a sandboxed iframe (opaque origin, no access to this page),
// rendered when it scrolls near the viewport. "Edit" swaps the highlighted code for CodeMirror.
// MDN examples with value choices get a row of buttons that apply a declaration block to the
// example element, as MDN's own interactive examples do.

type Lang = "html" | "css" | "js";
type Source = Record<Lang, string | null> & { choices: string[] | null };

const SANDBOX = "allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox";
// The base styles of MDN's interactive examples (mdn/dex, cloud-function/src/internal/play), so
// the examples render as on MDN. "choice" examples center one element in a 300 px stage;
// "tabbed" examples are plain documents. Showcases written for this site get a neutral page.
const CHOICE_CSS = `body{font:400 1rem/1.1876 Inter,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Fira Sans","Droid Sans","Helvetica Neue",sans-serif;color:#15141a;background:#fff;height:300px;overflow:hidden;position:relative;padding:1rem;margin:0;box-sizing:border-box}
section{height:100%;text-align:center;display:flex;align-items:center;justify-content:center}
section.flex-column{flex-direction:column;align-items:initial}
section.display-block{display:block}
section img{flex-grow:0}
section.hidden{display:none}
.transition-all{transition:all 0.3s ease-in}
*{box-sizing:border-box}`;
const TABBED_CSS = `body{background:#fff;font:400 1rem/1.1876 Inter,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Fira Sans","Droid Sans","Helvetica Neue",sans-serif;color:#15141a;font-size:0.9rem;line-height:1.5;padding:2rem 1rem 1rem;margin:0;min-width:min-content}`;
const SHOWCASE_CSS = "body{margin:16px;font-family:system-ui,sans-serif;color:#1b1b1b;background:#fff}";
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

/**
 * Runs inside a preview with value choices. Serialized with toString(), so it must not use
 * anything from this module. Applies a choice to #example-element (MDN's convention) when the
 * page asks through a MessagePort, and reports which choices this browser does not support.
 */
function choiceAgent(id: string, choices: string[]) {
  const supported = (code: string) =>
    code
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .every((d) => CSS.supports(d));
  const apply = (code: string) => {
    const el = document.getElementById("example-element");
    if (el) el.style.cssText = code;
  };
  const channel = new MessageChannel();
  channel.port1.onmessage = (e) => {
    const data = (e.data ?? {}) as { choice?: unknown };
    if (typeof data.choice === "string") apply(data.choice);
  };
  apply(choices[0]);
  parent.postMessage({ example: id, port: true, unsupported: choices.map((c) => !supported(c)) }, "*", [channel.port2]);
}

function srcdoc(source: Source, id: string, base: string): string {
  const html = source.html ?? "";
  const fullDocument = /<html[\s>]|<!doctype/i.test(html);
  // The preview reports its height tagged with its example id so the page can size the frame.
  const resize = `<script>new ResizeObserver(() => parent.postMessage({ previewHeight: Math.ceil(document.documentElement.getBoundingClientRect().height), example: ${JSON.stringify(id)} }, "*")).observe(document.documentElement);<\/script>`;
  const agent = source.choices ? `<script>(${choiceAgent.toString()})(${JSON.stringify(id)}, ${JSON.stringify(source.choices)});<\/script>` : "";
  return (
    (fullDocument ? "" : `<!doctype html><meta charset="utf-8"><style>${base}</style>`) +
    (source.css ? `<style>${source.css}</style>` : "") +
    html +
    (source.js ? `<script>${source.js}<\/script>` : "") +
    resize +
    agent
  );
}

function combined(source: Source, choice: number): string {
  const chosen = source.choices?.[choice];
  const css = [source.css, chosen && `#example-element {\n  ${chosen.replace(/\n/g, "\n  ")}\n}`].filter(Boolean).join("\n\n");
  return [source.html, css && `<style>\n${css}\n</style>`, source.js && `<script>\n${source.js}\n<\/script>`].filter(Boolean).join("\n\n");
}

const handlers = new Map<string, (data: Record<string, unknown>, ports: readonly MessagePort[]) => void>();

function setup(root: HTMLElement) {
  const id = root.dataset.example!;
  const original: Source = JSON.parse(root.querySelector("[data-source]")!.textContent!);
  const current: Source = { ...original };
  const showcase = root.classList.contains("showcase");
  const written = root.classList.contains("written");
  const frameHost = root.querySelector<HTMLElement>("[data-frame]")!;
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
  const choiceButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-choice]")];
  const editButton = root.querySelector<HTMLButtonElement>('[data-action="edit"]')!;
  const resetButton = root.querySelector<HTMLButtonElement>('[data-action="reset"]')!;
  const copyButton = root.querySelector<HTMLButtonElement>('[data-action="copy"]')!;
  const maxHeight = Number(root.dataset.maxHeight ?? 720);
  let frame: HTMLIFrameElement | null = null;
  let editors: (Editor & { lang: Lang })[] = [];
  let timer: number | undefined;
  let choice = 0;

  // Set by each new preview document (every render), see choiceAgent.
  let port: MessagePort | null = null;
  const render = () => {
    port = null;
    const base = showcase
      ? SHOWCASE_CSS
      : written
        ? `:root{color-scheme:${isDark() ? "dark" : "light"}}${WRITTEN_CSS}`
        : current.choices
          ? CHOICE_CSS
          : TABBED_CSS;
    if (frame) frame.srcdoc = srcdoc(current, id, base);
  };
  if (written) onThemeChange(render);

  new IntersectionObserver(
    (entries, observer) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      frame = document.createElement("iframe");
      frame.title = `Live preview: ${frameHost.dataset.label}`;
      frame.setAttribute("sandbox", SANDBOX);
      frameHost.append(frame);
      render();
    },
    { rootMargin: "300px 0px" },
  ).observe(frameHost);

  handlers.set(id, (data, ports) => {
    if (data.port === true && ports[0]) {
      port = ports[0];
      // A re-render starts from the first choice: re-apply the one selected on the page.
      if (choice) port.postMessage({ choice: current.choices?.[choice] });
    }
    if (typeof data.previewHeight === "number" && frame) {
      frame.style.height = `${Math.min(Math.max(data.previewHeight, 140), maxHeight)}px`;
    }
    if (Array.isArray(data.unsupported)) {
      choiceButtons.forEach((b, i) => (data.unsupported as boolean[])[i] ? b.setAttribute("data-unsupported", "") : b.removeAttribute("data-unsupported"));
    }
  });

  for (const button of choiceButtons) {
    button.addEventListener("click", () => {
      choice = Number(button.dataset.choice);
      for (const b of choiceButtons) b.setAttribute("aria-checked", String(b === button));
      port?.postMessage({ choice: current.choices?.[choice] });
    });
  }

  const select = (tab: HTMLButtonElement) => {
    for (const t of tabs) {
      const selected = t === tab;
      t.setAttribute("aria-selected", String(selected));
      t.tabIndex = selected ? 0 : -1;
      panels.find((p) => p.id === t.getAttribute("aria-controls"))!.hidden = !selected;
    }
  };
  for (const tab of tabs) {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      const next = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  }

  editButton.addEventListener("click", async () => {
    editButton.disabled = true;
    editButton.textContent = "Loading editor…";
    // Deliberately lazy: CodeMirror (about 190 KB gzipped) is only downloaded by readers who edit an example.
    const { createEditor } = await import("./editor");
    editors = panels.map((panel) => {
      const lang = panel.dataset.panel as Lang;
      panel.querySelector("pre")!.hidden = true;
      const editor = createEditor(panel, lang, current[lang] ?? "", (value) => {
        current[lang] = value;
        resetButton.hidden = false;
        clearTimeout(timer);
        timer = window.setTimeout(render, 300);
      });
      return { lang, ...editor };
    });
    editButton.textContent = "Editing";
    editButton.setAttribute("aria-pressed", "true");
    editors.find((e) => !panels.find((p) => p.dataset.panel === e.lang)!.hidden)?.focus();
  });

  resetButton.addEventListener("click", () => {
    Object.assign(current, original);
    for (const editor of editors) editor.set(original[editor.lang] ?? "");
    resetButton.hidden = true;
    render();
  });

  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(combined(current, choice));
    copyButton.textContent = "Copied";
    setTimeout(() => (copyButton.textContent = "Copy"), 1500);
  });
}

for (const root of document.querySelectorAll<HTMLElement>("[data-example]")) setup(root);

// Every preview posts messages tagged with its example id; route them to that example.
window.addEventListener("message", (e) => {
  const data: unknown = e.data;
  if (typeof data !== "object" || data === null || !("example" in data) || typeof data.example !== "string") return;
  handlers.get(data.example)?.(data as Record<string, unknown>, e.ports);
});
