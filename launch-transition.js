(function () {
  var start = document.querySelector(".start-btn");
  var page = document.querySelector(".launch-page .page");
  var overlay = document.getElementById("launch-overlay");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!start) return;

  start.addEventListener("click", function (e) {
    e.preventDefault();
    var href = start.getAttribute("href") || "shop.html";

    var delay = reduceMotion ? 0 : 1000;

    if (!reduceMotion) {
      document.documentElement.classList.add("launch-transitioning");
      if (overlay) {
        overlay.hidden = false;
        overlay.removeAttribute("aria-hidden");
        requestAnimationFrame(function () {
          overlay.classList.add("is-active");
        });
      }
    }

    window.setTimeout(function () {
      window.location.href = href;
    }, delay);
  }, true);
})();
