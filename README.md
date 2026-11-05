# CSS Features

Every CSS feature, alive: <https://css.charmaweb.com>

Each property, selector, at-rule, function and type has a live preview you can edit, its
definition table and syntax from the specification, browser support and Baseline status. The
Modern CSS gallery (<https://css.charmaweb.com/modern/>) shows every feature that reached
Baseline, or shipped in a browser engine, in 2023 or later, each one running live, many with a
demo written for the site. Every description is quoted from the official sources, nothing is
paraphrased:

- [W3C CSS specifications](https://www.w3.org/Style/CSS/) through [webref](https://github.com/w3c/webref) and [browser-specs](https://github.com/w3c/browser-specs)
- [MDN](https://github.com/mdn/content) (summaries and examples)
- [MDN browser-compat-data](https://github.com/mdn/browser-compat-data) (status and support)
- [web-features](https://github.com/web-platform-dx/web-features) (Baseline and the named modern features)

## Run it

Requires [Bun](https://bun.sh) and Node 22.23.4 or later.

```bash
bun install
bun run sync   # refresh data/ from the sources
bun run dev    # http://localhost:4341
bun run check  # type-check and build to dist/
```

## Licence

The code is under the MIT licence (`LICENSE`). The content quotes the W3C specifications (© W3C,
[W3C Software and Document License](https://www.w3.org/copyright/software-license/)), MDN prose
(CC BY-SA 2.5), MDN code examples and browser-compat-data (CC0) and web-features (Apache 2.0), so
the site content is shared under [CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5/).
