(function () {
  function getCart() {
    try {
      var raw = localStorage.getItem("artbyivory-cart");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function countItems(cart) {
    return cart.reduce(function (n, item) {
      return n + (item.qty || 1);
    }, 0);
  }

  function updateBadge() {
    var el = document.getElementById("cart-count");
    if (!el) return;
    var cart = getCart();
    var n = countItems(cart);
    el.textContent = n;
    el.setAttribute("aria-label", n + " items in cart");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateBadge);
  } else {
    updateBadge();
  }
  window.addEventListener("storage", updateBadge);
  window.addEventListener("cart-updated", updateBadge);
})();
