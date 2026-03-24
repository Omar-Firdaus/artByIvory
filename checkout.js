(function () {
  var form = document.getElementById("checkout-form");
  var itemsEl = document.getElementById("checkout-items");
  var totalEl = document.getElementById("checkout-total");
  var checkoutContent = document.getElementById("checkout-content");
  var checkoutEmpty = document.getElementById("checkout-empty");

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function renderSummary(cart) {
    var html = "";
    var total = 0;
    cart.forEach(function (item) {
      var price = parseFloat(item.price) || 0;
      var qty = item.qty || 1;
      var subtotal = price * qty;
      total += subtotal;
      html += '<div class="checkout-summary__row">';
      html += '<span class="checkout-summary__name">' + escapeHtml(item.title || "Item") + " × " + qty + "</span>";
      html += '<span class="checkout-summary__price">$' + subtotal.toFixed(2) + "</span>";
      html += "</div>";
    });
    itemsEl.innerHTML = html || "<p>No items</p>";
    totalEl.textContent = "Total: $" + total.toFixed(2);
  }

  function handleSubmit(e) {
    e.preventDefault();
    var cart = window.ArtByIvoryCart ? window.ArtByIvoryCart.get() : [];
    if (!cart.length) {
      checkoutContent.hidden = true;
      checkoutEmpty.hidden = false;
      return false;
    }
    var data = {
      name: document.getElementById("checkout-name").value.trim(),
      email: document.getElementById("checkout-email").value.trim(),
      address: document.getElementById("checkout-address").value.trim(),
      city: document.getElementById("checkout-city").value.trim(),
      state: document.getElementById("checkout-state").value.trim(),
      zip: document.getElementById("checkout-zip").value.trim(),
      notes: document.getElementById("checkout-notes").value.trim(),
      cart: cart,
      total: cart.reduce(function (sum, i) {
        return sum + (parseFloat(i.price) || 0) * (i.qty || 1);
      }, 0)
    };
    try {
      sessionStorage.setItem("artByIvoryLastOrder", JSON.stringify(data));
      if (window.ArtByIvoryCart) window.ArtByIvoryCart.clear();
      window.location.href = "order-confirmation.html";
    } catch (err) {
      console.error(err);
      window.location.href = "order-confirmation.html";
    }
    return false;
  }

  function useSquareCheckout() {
    var b = window.__CHECKOUT_API_BASE__;
    if (typeof b === "string" && b.trim().length > 0) return true;
    try {
      var h = location.hostname;
      if (h !== "localhost" && h !== "127.0.0.1") return true;
    } catch (e) {}
    return false;
  }

  function init() {
    var cart = window.ArtByIvoryCart ? window.ArtByIvoryCart.get() : [];
    if (!cart.length) {
      checkoutContent.hidden = true;
      checkoutEmpty.hidden = false;
      return;
    }
    checkoutEmpty.hidden = true;
    checkoutContent.hidden = false;
    renderSummary(cart);

    var paySection = document.querySelector(".checkout-payment");
    var noteEl = document.getElementById("checkout-summary-note");
    var submitBtn = document.getElementById("checkout-submit");

    if (useSquareCheckout()) {
      if (noteEl) noteEl.textContent = "Shipped from Montana.";
    } else {
      if (paySection) paySection.hidden = true;
      if (noteEl) {
        noteEl.textContent =
          "We'll email you payment instructions once your order is confirmed. Shipped from Montana.";
      }
      if (submitBtn) submitBtn.textContent = "Place order";
      form.addEventListener("submit", handleSubmit);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
