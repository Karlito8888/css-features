const toasts = document.getElementById("toasts");
const restore = document.getElementById("restore");
const menu = document.getElementById("menu");
const menuButton = document.getElementById("menu-button");

toasts.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  button.closest(".toast").classList.add("gone");
  (toasts.querySelector(".toast:not(.gone) button") || restore).focus();
});

restore.addEventListener("click", () => {
  for (const toast of toasts.children) toast.classList.remove("gone");
});

function setMenu(open) {
  menu.classList.toggle("open", open);
  menuButton.setAttribute("aria-expanded", String(open));
}

menuButton.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
menu.addEventListener("click", (event) => {
  if (event.target.closest("button")) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});
