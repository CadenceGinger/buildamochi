// Page layout only (community addition): side-panel tabs. No game or brain logic here.
// The Brain tab is the game's own brain view: opening the tab presses the game's Brain button,
// leaving it closes the view again, so the brain is only drawn while it is on screen.
(function () {
  const $ = id => document.getElementById(id);
  const side = $("side"), brain = $("brain"), toggle = $("brainToggle");
  const tabs = [...side.querySelectorAll("[data-tab]")], panes = [...side.querySelectorAll("[data-pane]")];
  const narrow = () => matchMedia("(max-width: 899px)").matches;
  let current = null;
  function show(tab) {
    current = tab; side.dataset.tab = tab;
    for (const t of tabs) { const on = t.dataset.tab === tab; t.classList.toggle("on", on); t.setAttribute("aria-selected", on); }
    for (const p of panes) p.classList.toggle("active", p.dataset.pane === tab);
    try { localStorage.setItem("mochi-tab", tab); } catch (e) { /* private mode */ }
  }
  function select(tab) {
    const open = brain.classList.contains("open");
    if ((tab === "brain") !== open) toggle.click();       // the game's own toggle
    show(tab);
  }
  for (const t of tabs) t.addEventListener("click", () => select(t.dataset.tab));
  // Follow the game's toggle (button, B key, ✕): open = Brain tab, closed = back to Care.
  new MutationObserver(() => {
    const open = brain.classList.contains("open");
    if (open && current !== "brain") show("brain");
    else if (!open && current === "brain") show("care");
  }).observe(brain, { attributes: true, attributeFilter: ["class"] });
  // The game opens the brain while it boots; phones start on Care with the brain closed.
  let saved = null; try { saved = localStorage.getItem("mochi-tab"); } catch (e) { /* none */ }
  const first = narrow() ? (saved && saved !== "brain" ? saved : "care") : (saved || "brain");
  show(first);
  const settle = () => { if ((first === "brain") !== brain.classList.contains("open")) toggle.click(); show(first); };
  // wait until the game has wired its Brain button, then settle once
  let tries = 0;
  const wait = setInterval(() => { if (toggle.onclick || ++tries > 50) { clearInterval(wait); settle(); } }, 100);
})();
