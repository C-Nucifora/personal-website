// Sweep: mounts content in the source preview, then wires up the project index.
// Built pages arrive with the markup already in place. The hero scan is scan.js.
(function () {
  if (window.CNViews && window.CN)
    CNViews.mount(CNViews.sweep.slots(window.CN, { pages: false }));

  // Rows are links without JavaScript; here they become disclosure buttons.
  for (const link of document.querySelectorAll(".index a.row")) {
    const panel = link.closest("li").querySelector(".panel");
    const button = document.createElement("button");
    button.className = "row";
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", panel.id);
    button.append(...link.childNodes);
    button.addEventListener("click", () => toggle(button, panel));
    link.replaceWith(button);
  }

  function toggle(button, panel, force) {
    const open = force ?? button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
  }

  function openFromHash() {
    const target =
      location.hash && document.getElementById(location.hash.slice(1));
    const button = target && target.querySelector(".row");
    if (button) toggle(button, target.querySelector(".panel"), true);
  }
  window.addEventListener("hashchange", openFromHash);
  openFromHash();
})();
