const STATES = ["busy", "done", "failed"];

class TaskButton extends HTMLElement {
  #internals = this.attachInternals();
  #readout;

  connectedCallback() {
    this.tabIndex = 0;
    this.setAttribute("role", "button");
    this.#readout = this.parentElement.querySelector("code");
    this.addEventListener("click", () => this.#press());
    this.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.#press();
      }
    });
  }

  // The element holds one state at a time and exposes it to CSS as :state(...).
  #setState(name) {
    const states = this.#internals.states;
    try {
      for (const state of STATES) states.delete(state);
      if (name) states.add(name);
    } catch {
      return; // an older browser that only knows the dashed-ident syntax
    }
    this.#readout.textContent = [...states].join(", ") || "none";
    this.setAttribute("aria-busy", String(name === "busy"));
  }

  #press() {
    const states = this.#internals.states;
    if (states.has("busy")) return;
    if (states.has("done") || states.has("failed")) return this.#setState(null);
    this.#setState("busy");
    setTimeout(() => this.#setState(this.hasAttribute("data-fails") ? "failed" : "done"), 1400);
  }
}

customElements.define("task-button", TaskButton);
