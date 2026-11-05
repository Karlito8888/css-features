const demo = document.querySelector(".demo-ok");
document.getElementById("light").addEventListener("input", (e) => demo.style.setProperty("--lightness", e.target.value));
