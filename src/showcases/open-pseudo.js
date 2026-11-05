const note = document.getElementById("note");
document.getElementById("toggle").addEventListener("click", () => {
  if (note.open) note.close();
  else note.show();
});
