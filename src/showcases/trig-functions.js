const demo = document.querySelector(".demo-trig");
const slider = document.getElementById("rot");
const out = document.getElementById("out");
const ring = document.getElementById("ring");

slider.addEventListener("input", () => {
  demo.style.setProperty("--rot", slider.value + "deg");
  out.textContent = slider.value + "deg";
});

// Hand the pointer position, relative to the middle of the ring, to the CSS as two lengths.
ring.addEventListener("pointermove", (event) => {
  const box = ring.getBoundingClientRect();
  demo.style.setProperty("--dx", event.clientX - (box.left + box.width / 2) + "px");
  demo.style.setProperty("--dy", event.clientY - (box.top + box.height / 2) + "px");
});
