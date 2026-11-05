// The cards are built here so the demo stays short; the CSS is what matters.
const list = document.getElementById("cv-list");
const scroller = list.parentElement;
const toggle = document.getElementById("cv-toggle");
const count = document.getElementById("cv-count");
const time = document.getElementById("cv-time");
const total = 600;
document.getElementById("cv-total").textContent = total;

// The browser tells us each time it starts or stops skipping the contents of a card.
const rendered = new Set();
function showCount() {
  count.textContent = toggle.checked ? rendered.size : total;
}
list.addEventListener("contentvisibilityautostatechange", (event) => {
  if (event.skipped) rendered.delete(event.target);
  else rendered.add(event.target);
  showCount();
});

// Build the list again under the chosen value and time the layout of all the cards.
function build() {
  const cards = document.createDocumentFragment();
  for (let i = 1; i <= total; i++) {
    const card = document.createElement("li");
    card.className = "cv-card";
    card.innerHTML = '<span class="cv-n">' + i + "</span><div><h2>Card " + i + "</h2><p>Many small boxes to lay out and paint.</p></div>" +
      '<div class="cv-tiles">' + "<i></i>".repeat(30) + "</div>";
    cards.append(card);
  }
  rendered.clear();
  list.replaceChildren();
  scroller.scrollTop = 0;
  const start = performance.now();
  list.append(cards);
  list.getBoundingClientRect(); // forces the layout the browser would otherwise delay
  time.textContent = Math.round(performance.now() - start) + " ms";
  showCount();
}

toggle.addEventListener("change", build);
build();
