const demo = document.querySelector(".demo-hang");
const indent = document.getElementById("indent");
const out = document.getElementById("indent-out");

indent.addEventListener("input", () => {
  demo.style.setProperty("--indent", indent.value + "em");
  out.textContent = indent.value + "em";
});
