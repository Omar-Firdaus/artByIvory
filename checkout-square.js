(function () {
  "use strict";

  function apiBase() {
    var b = window.__CHECKOUT_API_BASE__;
    return typeof b === "string" && b.trim() ? b.replace(/\/$/, "") : "";
  }

  function isDeployedHost() {
    var h = typeof location !== "undefined" ? location.hostname : "";
    return h !== "localhost" && h !== "127.0.0.1";
  }

  function shouldInit() {
    return !!apiBase() || isDeployedHost();
  }

  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 12);
  }

  function getCart() {
    return window.ArtByIvoryCart ? window.ArtByIvoryCart.get() : [];
  }

  function cartTotalDollars(cart) {
    return cart.reduce(function (sum, i) {
      return sum + (parseFloat(i.price) || 0) * (i.qty || 1);
    }, 0);
  }

  function formatMoney(dollars) {
    return (Math.round(dollars * 100) / 100).toFixed(2);
  }

  function getBuyer() {
    return {
      name: document.getElementById("checkout-name").value.trim(),
      email: document.getElementById("checkout-email").value.trim(),
      address: document.getElementById("checkout-address").value.trim(),
      city: document.getElementById("checkout-city").value.trim(),
      state: document.getElementById("checkout-state").value.trim(),
      zip: document.getElementById("checkout-zip").value.trim(),
      notes: document.getElementById("checkout-notes").value.trim(),
    };
  }

  function loadSquareWebSdk(useSandbox) {
    return new Promise(function (resolve, reject) {
      var wantSrc = useSandbox
        ? "https://sandbox.web.squarecdn.com/v1/square.js"
        : "https://web.squarecdn.com/v1/square.js";
      var existing = document.querySelector('script[data-artbyivory-square="1"]');
      if (existing && existing.src === wantSrc && window.Square) {
        return resolve();
      }
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }
      delete window.Square;
      var s = document.createElement("script");
      s.src = wantSrc;
      s.async = true;
      s.setAttribute("data-artbyivory-square", "1");
      s.onload = function () { resolve(); };
      s.onerror = function () {
        reject(new Error("Could not load Square Web Payments SDK script."));
      };
      document.head.appendChild(s);
    });
  }

  async function initSquare() {
    if (!shouldInit()) return;

    var form = document.getElementById("checkout-form");
    var cardContainer = document.getElementById("checkout-card-container");
    var statusEl = document.getElementById("checkout-payment-status");
    var errEl = document.getElementById("checkout-payment-error");
    var submitBtn = document.getElementById("checkout-submit");
    var checkoutContent = document.getElementById("checkout-content");
    var appleWrap = document.getElementById("checkout-apple-pay-wrap");
    var appleBtn = document.getElementById("checkout-apple-pay-button");
    var appleNote = document.getElementById("checkout-apple-pay-note");

    if (!form || !cardContainer) {
      return;
    }

    var base = apiBase();
    if (!base) {
      if (statusEl) {
        statusEl.textContent =
          "Set CHECKOUT_API_PRODUCTION in checkout-config.js to your payment API’s HTTPS URL (where server/ runs), commit, and redeploy.";
      }
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        showError(
          errEl,
          "Payment API URL is not set. Edit checkout-config.js (CHECKOUT_API_PRODUCTION), deploy your server/, then push."
        );
      });
      return;
    }

    if (statusEl) {
      statusEl.textContent = "Connecting to payment server…";
    }

    async function submitPaymentToServer(sourceId, opts) {
      opts = opts || {};
      var resetCardBtn = opts.resetCardBtn !== false;
      var applePayBtn = opts.applePayBtn;

      showError(errEl, "");

      var cart = getCart();
      if (!cart.length) {
        if (checkoutContent) checkoutContent.hidden = true;
        var empty = document.getElementById("checkout-empty");
        if (empty) empty.hidden = false;
        if (resetCardBtn && submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Pay & place order";
        }
        if (applePayBtn) applePayBtn.disabled = false;
        return;
      }

      var buyer = getBuyer();
      var totalDollars = cartTotalDollars(cart);

      var payRes;
      try {
        payRes = await fetch(base + "/api/square/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceId: sourceId,
            idempotencyKey: uuid(),
            cart: cart,
            buyer: buyer,
          }),
        });
      } catch (netErr) {
        showError(errEl, "Network error. Check your connection and payment server.");
        if (resetCardBtn && submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Pay & place order";
        }
        if (applePayBtn) applePayBtn.disabled = false;
        return;
      }

      var payJson = await payRes.json().catch(function () { return {}; });
      if (!payRes.ok) {
        showError(errEl, payJson.error || "Payment declined.");
        if (resetCardBtn && submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Pay & place order";
        }
        if (applePayBtn) applePayBtn.disabled = false;
        return;
      }

      var orderData = {
        name: buyer.name,
        email: buyer.email,
        address: buyer.address,
        city: buyer.city,
        state: buyer.state,
        zip: buyer.zip,
        notes: buyer.notes,
        cart: cart,
        total: totalDollars,
        paidViaSquare: true,
        squarePaymentId: payJson.paymentId,
        squareReceiptUrl: payJson.receiptUrl,
        squareReferenceId: payJson.referenceId,
      };

      try {
        sessionStorage.setItem("artByIvoryLastOrder", JSON.stringify(orderData));
        if (window.ArtByIvoryCart) window.ArtByIvoryCart.clear();
        window.location.href = "order-confirmation.html";
      } catch (storeErr) {
        console.error(storeErr);
        window.location.href = "order-confirmation.html";
      }
    }

    var res;
    try {
      res = await fetch(base + "/api/square/config");
    } catch (e) {
      if (statusEl) {
        statusEl.textContent =
          "Cannot reach payment API at " +
          base +
          ". If you use Render, confirm the service is live; locally, run npm start in server/.";
      }
      return;
    }

    var cfg = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      if (statusEl) statusEl.textContent = cfg.error || "Square config unavailable.";
      return;
    }

    var useSandbox = cfg.environment !== "production";

    if (statusEl) {
      statusEl.textContent = useSandbox
        ? "Sandbox test mode — use Square test card numbers. Apple Pay uses a real card in Wallet (not charged in sandbox)."
        : "Live payment (Square production).";
    }

    try {
      await loadSquareWebSdk(useSandbox);
    } catch (loadErr) {
      console.error(loadErr);
      if (statusEl) statusEl.textContent = loadErr.message || "Square SDK failed to load.";
      return;
    }

    if (!window.Square) {
      if (statusEl) statusEl.textContent = "Square SDK loaded but window.Square is missing.";
      return;
    }

    var appId = String(cfg.applicationId || "").trim();
    var locId = String(cfg.locationId || "").trim();
    if (!appId || !locId) {
      if (statusEl) {
        statusEl.textContent =
          "Missing Application ID or Location ID. Check server/.env and restart npm start.";
      }
      return;
    }

    var payments;
    try {
      payments = window.Square.payments(appId, locId);
    } catch (e) {
      console.error("Square.payments failed:", e);
      var hint =
        e && e.message
          ? e.message
          : "Invalid Application ID or Location ID (wrong sandbox/production pair, typo, or extra spaces in .env).";
      if (statusEl) {
        statusEl.textContent = "Could not start Square payments. " + hint;
      }
      return;
    }

    var card;
    try {
      card = await payments.card();
      await card.attach("#checkout-card-container");
    } catch (e) {
      console.error(e);
      if (statusEl) statusEl.textContent = "Could not load card form.";
      return;
    }

    var cartForPay = getCart();
    var totalForApple = cartTotalDollars(cartForPay);
    var applePay = null;
    var applePayFailReason = "";

    if (appleWrap && appleBtn && cartForPay.length > 0) {
      if (typeof payments.paymentRequest !== "function") {
        applePayFailReason = "This Square.js version has no paymentRequest(); try a hard refresh.";
      } else if (totalForApple <= 0) {
        applePayFailReason = "Cart total is zero — add items with a price.";
      } else {
        try {
          var paymentRequest = payments.paymentRequest({
            countryCode: "US",
            currencyCode: "USD",
            total: {
              amount: formatMoney(totalForApple),
              label: "Total",
            },
          });
          applePay = await payments.applePay(paymentRequest);
          if (!applePay) {
            applePayFailReason =
              "Square did not offer Apple Pay for this page (often hostname ≠ domain registered in Square, or Wallet not set up).";
          }
        } catch (apErr) {
          console.error("Apple Pay unavailable:", apErr);
          applePayFailReason =
            (apErr && apErr.message) ||
            (apErr && String(apErr)) ||
            "Unknown error from Square Apple Pay.";
        }
      }

      appleWrap.hidden = false;

      if (applePay) {
        appleBtn.disabled = false;
        appleBtn.removeAttribute("aria-disabled");
        appleBtn.classList.remove("checkout-apple-pay-button--unavailable");
        if (appleNote) {
          appleNote.textContent =
            "Uses Apple Wallet. Your domain must be verified for Apple Pay in the Square Dashboard.";
        }
        appleBtn.addEventListener("click", function (event) {
          event.preventDefault();
          showError(errEl, "");

          var cart = getCart();
          if (!cart.length) {
            if (checkoutContent) checkoutContent.hidden = true;
            var emptyEl = document.getElementById("checkout-empty");
            if (emptyEl) emptyEl.hidden = false;
            return;
          }

          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          appleBtn.disabled = true;

          applePay
            .tokenize()
            .then(function (tokenResult) {
              if (tokenResult.status !== "OK") {
                var detail =
                  tokenResult.errors && tokenResult.errors[0] && tokenResult.errors[0].message
                    ? tokenResult.errors[0].message
                    : "Apple Pay could not complete.";
                showError(errEl, detail);
                appleBtn.disabled = false;
                return;
              }
              return submitPaymentToServer(tokenResult.token, {
                resetCardBtn: false,
                applePayBtn: appleBtn,
              });
            })
            .catch(function (err) {
              console.error(err);
              showError(errEl, err && err.message ? err.message : "Apple Pay failed.");
              appleBtn.disabled = false;
            });
        });
      } else {
        appleBtn.disabled = true;
        appleBtn.setAttribute("aria-disabled", "true");
        appleBtn.classList.add("checkout-apple-pay-button--unavailable");
        if (appleNote) {
          var hints = [];
          if (typeof window.isSecureContext !== "undefined" && !window.isSecureContext) {
            hints.push("Use https:// for this site (not http://).");
          }
          var host = typeof location !== "undefined" ? location.hostname : "";
          if (
            applePayFailReason &&
            /only available on Safari|Method unsupported/i.test(applePayFailReason)
          ) {
            hints.push(
              "Square is blocking Apple Pay because this tab is not running in Apple’s Safari. " +
                "Use the Safari app (blue compass): on iPhone/iPad do not use Chrome or an in-app browser from Instagram/TikTok/Messages — open the link in Safari. " +
                "On Mac, open Safari from Applications (not Arc, Brave, or Chrome) and go to this checkout URL again."
            );
          }
          if (host) {
            hints.push(
              'Hostname "' +
                host +
                '" must match the domain registered under Apple Pay for this Square app (sandbox vs production too).'
            );
          }
          if (
            applePayFailReason &&
            !/only available on Safari|Method unsupported/i.test(applePayFailReason)
          ) {
            hints.push(applePayFailReason);
          }
          hints.push(
            "Mac: System Settings → Wallet & Apple Pay (add a card). Square Dashboard → your app → Apple Pay → domain verified for this host."
          );
          appleNote.textContent = hints.join(" ");
        }
      }
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      showError(errEl, "");

      var cart = getCart();
      if (!cart.length) {
        if (checkoutContent) checkoutContent.hidden = true;
        var empty = document.getElementById("checkout-empty");
        if (empty) empty.hidden = false;
        return;
      }

      if (!form.reportValidity()) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Processing…";
      }

      var tokenResult;
      try {
        tokenResult = await card.tokenize();
      } catch (err) {
        console.error(err);
        showError(errEl, "Card entry failed. Try again.");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Pay & place order";
        }
        return;
      }

      if (tokenResult.status !== "OK") {
        var detail =
          tokenResult.errors && tokenResult.errors[0] && tokenResult.errors[0].message
            ? tokenResult.errors[0].message
            : "Card could not be charged.";
        showError(errEl, detail);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Pay & place order";
        }
        return;
      }

      await submitPaymentToServer(tokenResult.token, {
        resetCardBtn: true,
        applePayBtn: null,
      });
    });
  }

  function boot() {
    if (!shouldInit()) return;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initSquare);
    } else {
      initSquare();
    }
  }

  boot();
})();
