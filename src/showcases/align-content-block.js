// Old engines accept align-content but ignore it on a block: measure to be sure.
(function () {
  var probe = document.createElement("div");
  probe.style.cssText = "display:block;height:100px;align-content:center;position:absolute;visibility:hidden";
  probe.innerHTML = "<div style='height:10px'></div>";
  document.body.appendChild(probe);
  var works = probe.firstChild.offsetTop > 0;
  probe.remove();
  if (!works) document.querySelector(".demo-ac .unsupported").setAttribute("data-off", "");
})();
