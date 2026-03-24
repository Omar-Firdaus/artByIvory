(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /** Let the nav bounce (~0.48s) finish with a little breathing room. */
  var BOUNCE_WAIT_MS = 1000;
  var pendingTimer = null;

  document.addEventListener(
    "click",
    function (e) {
      var a =
        e.target.closest("a.nav-link") ||
        e.target.closest("a.project-tiers__btn");
      if (!a) return;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) !== "#") return;
      if (href === "#") {
        e.preventDefault();
        return;
      }
      var id = href.slice(1);
      var target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();
      if (pendingTimer) clearTimeout(pendingTimer);
      var delay = reduceMotion ? 0 : BOUNCE_WAIT_MS;
      pendingTimer = setTimeout(function () {
        pendingTimer = null;
        target.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
        try {
          history.replaceState(null, "", "#" + id);
        } catch (err) {
          /* ignore */
        }
      }, delay);
    },
    true
  );
})();
