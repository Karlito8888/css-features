const demo = document.querySelector(".demo-mix");
document.getElementById("a").addEventListener("input", (e) => demo.style.setProperty("--a", e.target.value));
document.getElementById("b").addEventListener("input", (e) => demo.style.setProperty("--b", e.target.value));
