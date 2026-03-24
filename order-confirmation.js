(function () {
  var orderEl = document.getElementById("confirmation-order");
  var box = document.getElementById("confirmation-box");
  var empty = document.getElementById("confirmation-empty");

  function init() {
    try {
      var raw = sessionStorage.getItem("artByIvoryLastOrder");
      var order = raw ? JSON.parse(raw) : null;
      if (order && order.cart && order.cart.length) {
        var totalNum = typeof order.total === "number" ? order.total : parseFloat(order.total) || 0;
        var line = "Order total: $" + totalNum.toFixed(2);
        if (order.paidViaSquare && order.squarePaymentId) {
          line += " · Paid via Square";
          if (order.squareReceiptUrl) {
            line += " (receipt in email)";
          }
        }
        if (orderEl) orderEl.textContent = line;
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
