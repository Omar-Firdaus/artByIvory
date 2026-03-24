(function () {
  var CART_KEY = "artbyivory-cart";

  function getCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("cart-updated"));
  }

  function addItem(product) {
    var cart = getCart();
    var existing = cart.find(function (item) {
      return item.id === product.id && JSON.stringify(item.options || {}) === JSON.stringify(product.options || {});
    });
    if (existing) {
      existing.qty = (existing.qty || 1) + (product.qty || 1);
    } else {
      cart.push({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
        qty: product.qty || 1,
        options: product.options || {}
      });
    }
    setCart(cart);
  }

  function removeItem(index) {
    var cart = getCart();
    cart.splice(index, 1);
    setCart(cart);
  }

  function updateQty(index, qty) {
    var cart = getCart();
    if (qty < 1) {
      cart.splice(index, 1);
    } else {
      cart[index].qty = qty;
    }
    setCart(cart);
  }

  function clearCart() {
    setCart([]);
  }

  window.ArtByIvoryCart = {
    get: getCart,
    add: addItem,
    remove: removeItem,
    updateQty: updateQty,
    clear: clearCart
  };
})();
