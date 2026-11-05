document.querySelector(".demo-if .board").addEventListener("change", (event) => {
  event.target.closest(".card").style.setProperty("--status", event.target.value);
});
