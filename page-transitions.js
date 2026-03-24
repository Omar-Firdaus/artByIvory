(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  document.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    if (a.classList.contains("start-btn")) return;
    var href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    if (new URL(href, location.origin).origin !== location.origin) return;

    e.preventDefault();
    document.documentElement.classList.add("page-exiting");
    setTimeout(function () {
      window.location.href = href;
    }, 200);
  }, true);
})();
