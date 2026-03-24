(function () {
  var orderEl = document.getElementById("confirmation-order");
  var box = document.getElementById("confirmation-box");
  var empty = document.getElementById("confirmation-empty");

  function init() {
    try {
      var raw = sessionStorage.getItem("artByIvoryLastOrder");
      var order = raw ? JSON.parse(raw) : null;
      if (order && order.cart && order.cart.length) {
        if (orderEl) orderEl.textContent = "Order total: $" + (order.total || 0).toFixed(2);
        if (box) box.hidden = false;
        if (empty) empty.hidden = true;
        sessionStorage.removeItem("artByIvoryLastOrder");
      } else {
        if (orderEl) orderEl.textContent = "";
        if (box) box.hidden = true;
        if (empty) empty.hidden = false;
      }
    } catch (e) {
      if (orderEl) orderEl.textContent = "";
      if (box) box.hidden = true;
      if (empty) empty.hidden = false;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
