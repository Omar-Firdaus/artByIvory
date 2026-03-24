(function () {
  var btn = document.getElementById("nav-menu-btn");
  var panel = document.getElementById("nav-side-panel");
  var overlay = document.getElementById("nav-overlay");
  var body = document.body;

  if (!btn || !panel) return;

  function openPanel() {
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    if (overlay) overlay.classList.add("is-open");
    if (body) body.classList.add("nav-panel-open");
    btn.setAttribute("aria-expanded", "true");
  }

  function closePanel() {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    if (overlay) overlay.classList.remove("is-open");
    if (body) body.classList.remove("nav-panel-open");
    btn.setAttribute("aria-expanded", "false");
  }

  function togglePanel() {
    if (panel.classList.contains("is-open")) {
      closePanel();
    } else {
      openPanel();
    }
  }

  btn.addEventListener("click", togglePanel);
  if (overlay) overlay.addEventListener("click", closePanel);

  panel.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closePanel);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel.classList.contains("is-open")) {
      closePanel();
    }
  });
})();
