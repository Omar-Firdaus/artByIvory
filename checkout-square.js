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

  function fetchWithTimeout(url, timeoutMs) {
    var ms = timeoutMs || 45000;
    if (typeof AbortController === "undefined") {
      return fetch(url);
    }
    var ctrl = new AbortController();
    var timer = setTimeout(function () {
      ctrl.abort();
    }, ms);
    return fetch(url, { signal: ctrl.signal }).finally(function () {
      clearTimeout(timer);
    });
  }

  function withTimeout(promise, ms, errMsg) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var t = setTimeout(function () {
        if (!settled) {
          settled = true;
          reject(new Error(errMsg || "Timed out."));
        }
      }, ms);
      Promise.resolve(promise).then(
        function (v) {
          if (!settled) {
            settled = true;
            clearTimeout(t);
            resolve(v);
          }
        },
        function (e) {
          if (!settled) {
            settled = true;
            clearTimeout(t);
            reject(e);
          }
        }
      );
    });
  }

  function loadSquareWebSdk(useSandbox, scriptTimeoutMs) {
    var scriptMs = scriptTimeoutMs || 45000;
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
      var deadline = setTimeout(function () {
        reject(new Error("Square payment script timed out."));
      }, scriptMs);
      var s = document.createElement("script");
      s.src = wantSrc;
      s.async = true;
      s.setAttribute("data-artbyivory-square", "1");
      s.onload = function () {
        clearTimeout(deadline);
        resolve();
      };
      s.onerror = function () {
        clearTimeout(deadline);
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

    if (checkoutContent && checkoutContent.hidden) {
      if (statusEl) {
        statusEl.textContent = "";
        statusEl.hidden = true;
      }
      return;
    }

    var cartEarly = getCart();
    if (!cartEarly.length) {
      if (statusEl) {
        statusEl.textContent = "";
        statusEl.hidden = true;
      }
      return;
    }

    var base = apiBase();
    if (!base) {
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Payment isn’t configured for this site yet.";
      }
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        showError(errEl, "Payment isn’t configured for this site yet.");
      });
      return;
    }

    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = "Loading payment…";
    }

    var slowHintTimer = setTimeout(function () {
      if (
        statusEl &&
        !statusEl.hidden &&
        (statusEl.textContent || "").trim() === "Loading payment…"
      ) {
        statusEl.textContent =
          "Still connecting… If this lasts more than a minute, your payment server (e.g. Render) may be asleep or paused — open its URL in a new tab, then refresh checkout.";
      }
    }, 12000);

    function clearSlowHint() {
      clearTimeout(slowHintTimer);
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
      res = await fetchWithTimeout(
        base + "/api/square/config?_=" + Date.now(),
        45000
      );
    } catch (e) {
      clearSlowHint();
      if (statusEl) {
        statusEl.hidden = false;
        if (e && e.name === "AbortError") {
          statusEl.textContent =
            "Payment server didn’t respond in time. In Render: open your service URL (try /health), confirm it’s not suspended, then refresh this page.";
        } else {
          statusEl.textContent =
            "We couldn’t reach the payment service. Check your connection, confirm checkout-config.js has the correct API URL, then try again.";
        }
      }
      return;
    }

    if (statusEl) {
      statusEl.textContent = "Loading secure card form…";
    }

    var cfg = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      clearSlowHint();
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = cfg.error || "Payment setup is unavailable. Try again later.";
      }
      return;
    }

    var useSandbox = cfg.environment !== "production";

    try {
      await loadSquareWebSdk(useSandbox);
    } catch (loadErr) {
      clearSlowHint();
      console.error(loadErr);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent =
          loadErr && loadErr.message && /timed out/i.test(loadErr.message)
            ? "Payment script timed out. Check your network or try again."
            : "Payment couldn’t load. Refresh the page and try again.";
      }
      return;
    }

    if (!window.Square) {
      clearSlowHint();
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Payment couldn’t load. Refresh the page and try again.";
      }
      return;
    }

    var appId = String(cfg.applicationId || "").trim();
    var locId = String(cfg.locationId || "").trim();
    if (!appId || !locId) {
      clearSlowHint();
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Checkout is temporarily unavailable.";
      }
      return;
    }

    var payments;
    try {
      payments = window.Square.payments(appId, locId);
    } catch (e) {
      clearSlowHint();
      console.error("Square.payments failed:", e);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Card payment couldn’t start. Refresh the page or try again later.";
      }
      return;
    }

    var card;
    try {
      card = await withTimeout(payments.card(), 35000, "Card field timed out.");
      await withTimeout(card.attach("#checkout-card-container"), 35000, "Card field timed out.");
    } catch (e) {
      clearSlowHint();
      console.error(e);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent =
          e && e.message && /timed out/i.test(e.message)
            ? "Card form took too long. Refresh, disable blockers, or try another network."
            : "Card form couldn’t load. Refresh and try again.";
      }
      return;
    }

    clearSlowHint();
    if (statusEl) {
      statusEl.textContent = "";
      statusEl.hidden = true;
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
          appleNote.textContent = "";
          appleNote.hidden = true;
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
        if (applePayFailReason) {
          console.info("Apple Pay unavailable:", applePayFailReason);
        }
        appleBtn.disabled = true;
        appleBtn.setAttribute("aria-disabled", "true");
        appleBtn.classList.add("checkout-apple-pay-button--unavailable");
        if (appleNote) {
          appleNote.textContent = "";
          appleNote.hidden = true;
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
    function run() {
      initSquare().catch(function (e) {
        console.error(e);
        var el = document.getElementById("checkout-payment-status");
        if (el) {
          el.hidden = false;
          el.textContent = "Payment couldn’t load. Refresh the page and try again.";
        }
      });
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run);
    } else {
      run();
    }
  }

  boot();
})();
