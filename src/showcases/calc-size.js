const demo = document.querySelector(".demo-cs");
const factor = document.getElementById("factor");
const expr = document.getElementById("expr");

factor.addEventListener("input", () => {
  demo.style.setProperty("--k", factor.value);
  expr.textContent = "height: calc-size(auto, size * " + factor.value + ")";
});
