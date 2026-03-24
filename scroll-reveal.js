(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var els = document.querySelectorAll(
    ".shop-featured__product, .shop-card, .shop-why__card, .about-story__block, .home-category, .home-made-to-wear__inner, .home-commissions__inner"
  );

  function reveal() {
    els.forEach(function (el, i) {
      var rect = el.getBoundingClientRect();
      var inView = rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
      if (inView) {
        el.classList.add("is-visible");
      }
    });
  }

  window.addEventListener("scroll", reveal, { passive: true });
  window.addEventListener("load", reveal);
  reveal();
})();
