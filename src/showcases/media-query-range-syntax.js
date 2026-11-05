var out = document.getElementById("w");
function update() { out.textContent = window.innerWidth + "px"; }
update();
window.addEventListener("resize", update);
