(function () {
  if (!window.matchMedia("(pointer: fine)").matches) return;

  var html = document.documentElement;
  html.classList.add("custom-cursor-active");

  var el = document.createElement("div");
  el.className = "custom-cursor";
  el.setAttribute("aria-hidden", "true");

  var img = document.createElement("img");
  img.src = "assets/cursor-up-left.svg";
  img.alt = "";
  img.draggable = false;
  el.appendChild(img);
  document.body.appendChild(el);

  function move(x, y) {
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.classList.add("custom-cursor--on");
  }

  document.addEventListener(
    "mousemove",
    function (e) {
      move(e.clientX, e.clientY);
    },
    { passive: true }
  );

  window.addEventListener("blur", function () {
    el.classList.remove("custom-cursor--on");
  });
})();
