const stage = document.getElementById("stage");
const bind = (id, name, label) => {
  const input = document.getElementById("in-" + id);
  const out = document.getElementById("out-" + id);
  const update = () => {
    stage.style.setProperty(name, input.value);
    out.textContent = label(input.value);
  };
  input.addEventListener("input", update);
  update();
};
bind("n", "--n", (v) => v);
bind("amt", "--amt", (v) => v + "%");
