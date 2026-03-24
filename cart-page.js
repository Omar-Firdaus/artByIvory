(function () {
  var cartItemsEl = document.getElementById("cart-items");
  var cartSummaryEl = document.getElementById("cart-summary");
  var cartEmptyEl = document.getElementById("cart-empty");
  var cartContentEl = document.getElementById("cart-content");

  function render() {
    var cart = window.ArtByIvoryCart ? window.ArtByIvoryCart.get() : [];
    if (cart.length === 0) {
      if (cartEmptyEl) cartEmptyEl.hidden = false;
      if (cartContentEl) cartContentEl.hidden = true;
      return;
    }
    if (cartEmptyEl) cartEmptyEl.hidden = true;
    if (cartContentEl) cartContentEl.hidden = false;

    var total = 0;
    var html = "";
    cart.forEach(function (item, i) {
      var subtotal = parseFloat(item.price) * (item.qty || 1);
      total += subtotal;
      var priceStr = "$" + parseFloat(item.price).toFixed(2);
      html += '<div class="cart-item" data-index="' + i + '">';
      html += '<div class="cart-item__media">';
      if (item.image) {
        html += '<img src="' + item.image + '" alt="" />';
      } else {
        html += '<div class="cart-item__placeholder">—</div>';
      }
      html += "</div>";
      html += '<div class="cart-item__info">';
      html += '<h3 class="cart-item__title">' + escapeHtml(item.title) + "</h3>";
      html += '<p class="cart-item__price">' + priceStr + " × " + (item.qty || 1) + "</p>";
      html += '<div class="cart-item__actions">';
      html += '<label class="cart-item__qty">Qty: <input type="number" min="1" value="' + (item.qty || 1) + '" data-index="' + i + '" /></label>';
      html += '<button type="button" class="cart-item__remove" data-index="' + i + '">Remove</button>';
      html += "</div></div>";
      html += '<div class="cart-item__subtotal">$' + subtotal.toFixed(2) + "</div>";
      html += "</div>";
    });

    if (cartItemsEl) cartItemsEl.innerHTML = html;

    if (cartSummaryEl) {
      cartSummaryEl.innerHTML =
        '<div class="cart-summary__total">Total: $' + total.toFixed(2) + "</div>" +
        '<a href="checkout.html" class="start-btn cart-checkout">Proceed to checkout</a>' +
        '<p class="cart-summary__note">Checkout via contact—we’ll confirm your order and payment.</p>';
    }

    cartItemsEl.querySelectorAll(".cart-item__remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = parseInt(btn.getAttribute("data-index"), 10);
        window.ArtByIvoryCart.remove(i);
        render();
      });
    });
    cartItemsEl.querySelectorAll(".cart-item__qty input").forEach(function (input) {
      input.addEventListener("change", function () {
        var i = parseInt(input.getAttribute("data-index"), 10);
        var qty = parseInt(input.value, 10) || 1;
        window.ArtByIvoryCart.updateQty(i, qty);
        render();
      });
    });
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
  window.addEventListener("storage", render);
})();
