// Records the order in which the cards receive focus.
var trail = document.getElementById("trail");
var seen = [];
function show() { trail.textContent = seen.length ? seen.join(" > ") : "none yet"; }
document.querySelector(".demo-rf .grid").addEventListener("focusin", function (e) {
  if (e.target.tagName === "BUTTON") { seen.push(e.target.textContent); show(); }
});
document.getElementById("reset").addEventListener("click", function () { seen = []; show(); });
document.querySelectorAll(".demo-rf input").forEach(function (r) {
  r.addEventListener("change", function () { seen = []; show(); });
});
