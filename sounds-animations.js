(function () {
  var ctx;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function getCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  function resume() {
    var c = getCtx();
    if (c && c.state === "suspended") c.resume();
  }

  /** City / graffiti / cartoon-style UI blip */
  function playSound(kind) {
    var c = getCtx();
    if (!c) return;

    var now = c.currentTime;
    var master = c.createGain();
    master.connect(c.destination);
    master.gain.value = reduceMotion ? 0.06 : 0.11;

    function tone(unused, f0, f1, t0, dur, vol, wave) {
      var o = c.createOscillator();
      o.type = wave || "square";
      o.frequency.setValueAtTime(f0, now + t0);
      if (f1 !== f0) {
        o.frequency.linearRampToValueAtTime(f1, now + t0 + dur);
      }
      var g = c.createGain();
      g.gain.setValueAtTime(vol, now + t0);
      g.gain.exponentialRampToValueAtTime(0.0008, now + t0 + dur + 0.02);
      o.connect(g);
      g.connect(master);
      o.start(now + t0);
      o.stop(now + t0 + dur + 0.03);
    }

    if (kind === "nav") {
      tone("triangle", 720, 480, 0, 0.055, 0.18, "triangle");
      return;
    }

    if (kind === "tier1") {
      tone("square", 340, 520, 0, 0.07, 0.16);
      tone("square", 200, 140, 0.04, 0.08, 0.07, "sawtooth");
      return;
    }
    if (kind === "tier2") {
      tone("square", 400, 620, 0, 0.065, 0.15);
      tone("square", 260, 180, 0.035, 0.09, 0.08, "sawtooth");
      return;
    }
    if (kind === "tier3") {
      tone("square", 280, 720, 0, 0.08, 0.17);
      tone("square", 160, 100, 0.045, 0.1, 0.09, "sawtooth");
      return;
    }

    /* default: sticker POP */
    var bump = (Math.random() - 0.5) * 35;
    tone("square", 300 + bump, 560 + bump, 0, 0.06, 0.16);
    tone("sawtooth", 190 + bump * 0.5, 95, 0.028, 0.09, 0.065, "sawtooth");
  }

  function soundKindFor(el) {
    if (el.matches("a.nav-link") || el.matches("a.process-back")) return "nav";
    var card = el.closest(".project-tiers__card");
    if (card) {
      var t = card.getAttribute("data-tier");
      if (t === "1") return "tier1";
      if (t === "2") return "tier2";
      if (t === "3") return "tier3";
    }
    return "default";
  }

  function findTarget(node) {
    if (!(node instanceof Element)) return null;
    var btn = node.closest("button");
    if (btn && btn.getAttribute("data-sound") === "off") return null;
    if (btn && !btn.disabled && btn.getAttribute("aria-disabled") !== "true") {
      return btn;
    }
    var tierStart = node.closest("a.project-tiers__btn");
    if (tierStart) return tierStart;
    var start = node.closest("a.start-btn");
    if (start) return start;
    var nav = node.closest("a.nav-link");
    if (nav) return nav;
    var back = node.closest("a.process-back");
    if (back) return back;
    return null;
  }

  function runHitAnim(el) {
    if (reduceMotion) return;
    el.classList.remove("ui-cartoon-hit");
    void el.offsetWidth;
    el.classList.add("ui-cartoon-hit");
    function done() {
      el.classList.remove("ui-cartoon-hit");
      el.removeEventListener("animationend", done);
    }
    el.addEventListener("animationend", done, { once: true });
  }

  document.addEventListener(
    "click",
    function (e) {
      var el = findTarget(e.target);
      if (!el) return;
      resume();
      playSound(soundKindFor(el));
      runHitAnim(el);
    },
    true
  );
})();

