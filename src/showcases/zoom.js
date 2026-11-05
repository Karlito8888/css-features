var level = document.getElementById("level");
var value = document.getElementById("value");
level.addEventListener("input", function () {
  document.querySelector(".demo-zoom").style.setProperty("--z", level.value);
  value.textContent = Number(level.value).toFixed(1);
});
