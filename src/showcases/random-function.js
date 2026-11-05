const fill = (id, count) => {
  const box = document.getElementById(id);
  box.replaceChildren(...Array.from({ length: count }, () => document.createElement("span")));
};

const reroll = () => {
  fill("stage", 70);
  fill("own", 10);
  fill("same", 10);
};

document.getElementById("reroll").addEventListener("click", reroll);
reroll();
