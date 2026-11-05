const demo = document.querySelector(".demo-as");
const slider = document.getElementById("v");

// The CSS does the work. This only prints the two numbers it receives.
slider.addEventListener("input", () => {
  const v = Number(slider.value);
  demo.style.setProperty("--v", v);
  document.getElementById("out").textContent = v;
  document.getElementById("sign").textContent = Math.sign(v);
  document.getElementById("abs").textContent = Math.abs(v);
});
