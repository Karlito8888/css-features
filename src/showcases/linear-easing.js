const demo = document.querySelector(".demo-linear");
const button = document.getElementById("drop");

button.addEventListener("click", () => {
  const dropped = demo.classList.toggle("dropped");
  button.textContent = dropped ? "Lift the balls" : "Drop the balls";
});
