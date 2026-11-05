const doc = document.getElementById("doc");
const input = document.getElementById("q");
const count = document.getElementById("count");
const added = document.getElementById("added");

if (CSS.highlights) {
  const search = new Highlight();
  const current = new Highlight();
  current.priority = 1; // wins over "search" where both paint the same text
  CSS.highlights.set("search", search);
  CSS.highlights.set("current", current);

  const elementsBefore = doc.getElementsByTagName("*").length;
  let ranges = [];
  let index = 0;

  function find() {
    ranges = [];
    const term = input.value.trim().toLowerCase();
    if (term) {
      const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.data.toLowerCase();
        for (let at = text.indexOf(term); at !== -1; at = text.indexOf(term, at + term.length)) {
          const range = new Range();
          range.setStart(node, at);
          range.setEnd(node, at + term.length);
          ranges.push(range);
        }
      }
    }
    index = 0;
    paint();
  }

  function paint() {
    search.clear();
    current.clear();
    ranges.forEach((range) => search.add(range));
    if (ranges.length) current.add(ranges[index]);
    count.value = ranges.length ? `${index + 1} of ${ranges.length}` : "No match";
    added.value = doc.getElementsByTagName("*").length - elementsBefore;
  }

  function step(by) {
    if (!ranges.length) return;
    index = (index + by + ranges.length) % ranges.length;
    paint();
  }

  input.addEventListener("input", find);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") step(event.shiftKey ? -1 : 1);
  });
  document.getElementById("next").addEventListener("click", () => step(1));
  document.getElementById("prev").addEventListener("click", () => step(-1));
  find();
}
