/** The theme in effect: the one forced by the toggle, else the system preference. */
export const isDark = () => {
  const forced = document.documentElement.dataset.theme;
  return forced ? forced === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

/** Calls `fn` whenever the toggle or the system changes the theme. */
export const onThemeChange = (fn: () => void) => {
  document.addEventListener("themechange", fn);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", fn);
};
