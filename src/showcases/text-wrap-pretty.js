// Reads back how many words sit on the last line of each paragraph.
function lastLineWords(p) {
  const node = p.firstChild;
  const text = node.textContent;
  const words = [...text.matchAll(/\S+/g)];
  const range = document.createRange();
  const tops = words.map((m) => {
    range.setStart(node, m.index);
    range.setEnd(node, m.index + m[0].length);
    return range.getClientRects()[0].top;
  });
  const last = tops[tops.length - 1];
  return tops.filter((t) => Math.abs(t - last) < 2).length;
}

function update() {
  for (const p of document.querySelectorAll(".body")) {
    const n = lastLineWords(p);
    const out = p.parentElement.querySelector(".stat strong");
    out.textContent = n === 1 ? "1 word" : n + " words";
    out.className = n === 1 ? "lone" : "ok";
  }
}

let timer;
new ResizeObserver(() => {
  clearTimeout(timer);
  timer = setTimeout(update, 120);
}).observe(document.querySelector(".stage"));
update();
