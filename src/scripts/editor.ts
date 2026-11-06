// Loaded on demand, the first time someone clicks "Edit" on an example.
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { Compartment } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { basicSetup, EditorView } from "codemirror";
import { isDark, onThemeChange } from "./theme";

const LANGUAGES = { html, css, js: javascript };

const base = EditorView.theme({
  "&": { fontSize: "0.85rem", backgroundColor: "var(--code-bg)" },
  ".cm-gutters": { backgroundColor: "var(--code-bg)", borderRight: "1px solid var(--border)" },
  ".cm-scroller": { fontFamily: "var(--font-mono), ui-monospace, monospace" },
});

export type Editor = { set: (value: string) => void; focus: () => void };

export function createEditor(parent: HTMLElement, lang: keyof typeof LANGUAGES, doc: string, onChange: (value: string) => void): Editor {
  const theme = new Compartment();
  const view = new EditorView({
    parent,
    doc,
    extensions: [
      basicSetup,
      LANGUAGES[lang](),
      base,
      theme.of(isDark() ? oneDark : []),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(update.state.doc.toString());
      }),
    ],
  });
  onThemeChange(() => view.dispatch({ effects: theme.reconfigure(isDark() ? oneDark : []) }));
  return {
    set(value: string) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    },
    focus: () => view.focus(),
  };
}
