const demo = document.querySelector(".demo-bf");
function bind(id, prop, unit) {
  const input = document.getElementById(id);
  const out = document.getElementById(id + "-out");
  input.addEventListener("input", () => {
    demo.style.setProperty(prop, input.value + unit);
    out.value = input.value + unit;
  });
}
bind("blur", "--blur", "px");
bind("sat", "--sat", "%");
