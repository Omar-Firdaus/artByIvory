(function () {
  "use strict";

  var root = document.querySelector("[data-mittens-carousel]");
  if (!root) return;

  var viewport = root.querySelector(".mittens-carousel__viewport");
  var track = root.querySelector(".mittens-carousel__track");
  var slides = track ? Array.prototype.slice.call(track.querySelectorAll(".mittens-carousel__slide")) : [];
  var btnPrev = root.querySelector('[data-carousel-prev]');
  var btnNext = root.querySelector('[data-carousel-next]');
  var dotsEl = root.querySelector(".mittens-carousel__dots");

  if (!viewport || !track || slides.length === 0) return;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var autoplayMs = reducedMotion ? 0 : 2800;
  var autoplayId = null;
  var activeIndex = 0;

  function scrollToIndex(i, opts) {
    opts = opts || {};
    if (i < 0) i = slides.length - 1;
    if (i >= slides.length) i = 0;
    activeIndex = i;
    var slide = slides[i];
    if (!slide) return;
    var target = slide.offsetLeft - (viewport.clientWidth - slide.offsetWidth) / 2;
    var useSmooth = opts.smooth === true && !reducedMotion;
    viewport.scrollTo({
      left: Math.max(0, target),
      behavior: useSmooth ? "smooth" : "auto",
    });
    updateDots();
    window.requestAnimationFrame(updateActiveSlide);
  }

  function nearestIndex() {
    var center = viewport.scrollLeft + viewport.clientWidth / 2;
    var best = 0;
    var bestDist = Infinity;
    slides.forEach(function (slide, i) {
      var mid = slide.offsetLeft + slide.offsetWidth / 2;
      var d = Math.abs(mid - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  function updateActiveSlide() {
    var idx = nearestIndex();
    activeIndex = idx;
    slides.forEach(function (s, i) {
      s.classList.toggle("is-active", i === idx);
    });
    updateDots();
  }

  function updateDots() {
    if (!dotsEl) return;
    var buttons = dotsEl.querySelectorAll("button");
    buttons.forEach(function (b, i) {
      var on = i === activeIndex;
      b.classList.toggle("is-active", on);
      if (on) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
  }

  function buildDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = "";
    slides.forEach(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mittens-carousel__dot";
      b.setAttribute("aria-label", "Go to slide " + (i + 1));
      b.addEventListener("click", function () {
        stopAutoplay();
        scrollToIndex(i, { smooth: false });
      });
      dotsEl.appendChild(b);
    });
    updateDots();
  }

  function next() {
    scrollToIndex(activeIndex + 1, { smooth: false });
  }

  function prev() {
    scrollToIndex(activeIndex - 1, { smooth: false });
  }

  function startAutoplay() {
    if (autoplayMs <= 0) return;
    stopAutoplay();
    autoplayId = window.setInterval(function () {
      var next = (activeIndex + 1) % slides.length;
      scrollToIndex(next, { smooth: false });
    }, autoplayMs);
  }

  function stopAutoplay() {
    if (autoplayId) {
      window.clearInterval(autoplayId);
      autoplayId = null;
    }
  }

  btnNext &&
    btnNext.addEventListener("click", function () {
      stopAutoplay();
      next();
    });
  btnPrev &&
    btnPrev.addEventListener("click", function () {
      stopAutoplay();
      prev();
    });

  var scrollEndTimer;
  viewport.addEventListener(
    "scroll",
    function () {
      window.clearTimeout(scrollEndTimer);
      scrollEndTimer = window.setTimeout(updateActiveSlide, 32);
    },
    { passive: true }
  );

  viewport.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      stopAutoplay();
      next();
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      stopAutoplay();
      prev();
    }
  });

  root.addEventListener("mouseenter", stopAutoplay);
  root.addEventListener("mouseleave", startAutoplay);
  root.addEventListener("focusin", stopAutoplay);
  root.addEventListener("focusout", function () {
    window.setTimeout(startAutoplay, 300);
  });

  window.addEventListener(
    "resize",
    function () {
      updateActiveSlide();
    },
    { passive: true }
  );

  buildDots();
  viewport.setAttribute("tabindex", "0");
  viewport.setAttribute("role", "region");
  viewport.setAttribute("aria-label", "Photo carousel");

  window.requestAnimationFrame(function () {
    scrollToIndex(0, { smooth: false });
    updateActiveSlide();
    startAutoplay();
  });
})();
