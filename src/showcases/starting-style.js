const cards = document.getElementById("cards");
const addButton = document.getElementById("add-card");
const dialog = document.getElementById("dialog");
const MAX_CARDS = 8;
let count = 0;

function addCard() {
  count += 1;
  const card = document.createElement("li");
  card.className = "card";
  card.style.setProperty("--hue", String((count * 47) % 360));
  card.textContent = "Card " + count;
  cards.append(card);
  addButton.disabled = cards.children.length >= MAX_CARDS;
}

addButton.addEventListener("click", addCard);
document.getElementById("clear-cards").addEventListener("click", () => {
  cards.replaceChildren();
  addButton.disabled = false;
});
document.getElementById("open-dialog").addEventListener("click", () => dialog.showModal());

// Cards rendered with the page also start from @starting-style.
addCard();
addCard();
addCard();
