const headline = document.getElementById("headline");
const words = document.getElementById("words");

words.addEventListener("input", () => {
  headline.textContent = words.value.trim() || "Paint with gradients";
});
