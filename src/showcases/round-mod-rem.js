const demo = document.querySelector(".demo-rmr");
const slider = document.getElementById("x");
const out = document.getElementById("out");

slider.addEventListener("input", () => {
  demo.style.setProperty("--x", slider.value + "px");
  out.textContent = slider.value + "px";
});
