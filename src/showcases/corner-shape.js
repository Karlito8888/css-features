const swatch = document.querySelector(".demo-corner .swatch");

function bind(id, out, apply) {
  const input = document.getElementById(id);
  const show = () => {
    document.getElementById(out).value = input.value;
    apply(input.value);
  };
  input.addEventListener("input", show);
  show();
}

bind("k", "kv", (v) => swatch.style.setProperty("corner-shape", `superellipse(${v})`));
bind("r", "rv", (v) => swatch.style.setProperty("border-radius", `${v}px`));
