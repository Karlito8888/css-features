const out = document.getElementById("dpr");

function show() {
  out.value = `${Number(window.devicePixelRatio.toFixed(2))}x`;
}
window.addEventListener("resize", show);
show();
