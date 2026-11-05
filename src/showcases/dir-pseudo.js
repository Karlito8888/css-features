const chat = document.getElementById("chat");
const buttons = document.querySelectorAll(".bar button");
for (const button of buttons) {
  button.addEventListener("click", () => {
    chat.dir = button.dataset.dir;
    for (const other of buttons) other.setAttribute("aria-pressed", String(other === button));
  });
}
