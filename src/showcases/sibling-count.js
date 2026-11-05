const fan = document.getElementById("fan");
const total = document.getElementById("total");
const show = () => { total.textContent = fan.children.length + (fan.children.length === 1 ? " card" : " cards"); };

document.getElementById("add").addEventListener("click", () => {
  if (fan.children.length >= 10) return;
  const card = document.createElement("li");
  card.className = "new";
  fan.append(card);
  show();
});

document.getElementById("remove").addEventListener("click", () => {
  if (fan.children.length <= 1) return;
  fan.lastElementChild.remove();
  show();
});
