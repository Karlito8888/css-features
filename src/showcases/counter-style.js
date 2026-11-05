const start = document.getElementById("start");
const lists = document.querySelectorAll(".demo-counter ol");

start.addEventListener("input", () => {
  const n = Math.min(9999, Math.max(1, parseInt(start.value, 10) || 1));
  lists.forEach((list) => { list.start = n; });
});
