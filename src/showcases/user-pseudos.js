// The preview is sandboxed: stop the real submit and just confirm.
const form = document.getElementById("signup");
const note = form.querySelector(".status");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  note.textContent = "Account created.";
});
form.addEventListener("reset", () => { note.textContent = ""; });
