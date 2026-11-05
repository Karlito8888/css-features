// The color input only changes one custom property. CSS does the rest.
const demo = document.querySelector(".demo-accent");
const pick = document.getElementById("pick");
const hex = document.getElementById("hex");
pick.addEventListener("input", () => {
  demo.style.setProperty("--accent", pick.value);
  hex.textContent = pick.value;
});
