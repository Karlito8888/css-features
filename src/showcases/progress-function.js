const demo = document.querySelector(".demo-pg");
const slider = document.getElementById("v");
const out = document.getElementById("out");

slider.addEventListener("input", () => {
  demo.style.setProperty("--v", slider.value);
  out.textContent = slider.value;
});
