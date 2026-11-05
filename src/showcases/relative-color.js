const demo = document.querySelector(".demo-rel");
document.getElementById("brand").addEventListener("input", (e) => demo.style.setProperty("--brand", e.target.value));
document.getElementById("turn").addEventListener("input", (e) => demo.style.setProperty("--turn", e.target.value));
