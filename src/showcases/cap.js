const demo = document.querySelector(".demo-cap");
const size = document.getElementById("size");
const out = document.getElementById("size-out");

size.addEventListener("input", () => {
  demo.style.setProperty("--size", size.value + "px");
  out.textContent = size.value + "px";
});
