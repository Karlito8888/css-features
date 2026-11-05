const source = document.getElementById("source");
const outputs = document.querySelectorAll(".demo-wsc .out");

source.addEventListener("input", () => {
  outputs.forEach((out) => { out.textContent = source.value; });
});
