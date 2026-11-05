const cards = document.getElementById("cards");
const layout = document.getElementById("layout");

// Run the DOM change inside a view transition when the browser has them.
const change = (update) => {
  if (document.startViewTransition) document.startViewTransition(update);
  else update();
};

document.getElementById("shuffle").addEventListener("click", () => {
  change(() => {
    const items = [...cards.children];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    cards.append(...items);
  });
});

layout.addEventListener("click", () => {
  change(() => {
    const list = cards.classList.toggle("list");
    layout.setAttribute("aria-pressed", String(list));
    layout.textContent = list ? "Grid layout" : "List layout";
  });
});

cards.addEventListener("click", (event) => {
  const card = event.target.closest("li");
  if (card && card !== cards.firstElementChild) change(() => cards.prepend(card));
});
