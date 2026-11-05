const demo = document.querySelector(".demo-exp");
const slider = document.getElementById("ratio");

slider.addEventListener("input", () => {
  demo.style.setProperty("--ratio", slider.value);
  document.getElementById("out").textContent = slider.value;
});
