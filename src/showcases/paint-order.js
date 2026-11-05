const root = document.querySelector(".demo-paint");
const range = document.getElementById("w");
const out = document.getElementById("wv");

function update() {
  root.style.setProperty("--w", range.value);
  out.value = range.value;
}
range.addEventListener("input", update);
update();
