const picker = document.querySelector(".demo-cc .picker");
document.getElementById("bg").addEventListener("input", (e) => picker.style.setProperty("--bg", e.target.value));
