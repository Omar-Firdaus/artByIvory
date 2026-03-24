/**
 * Base URL of the checkout API (server/index.js). No trailing slash.
 *
 * Local (localhost / 127.0.0.1): uses http://localhost:3001
 *
 * Production (Vercel, etc.): set CHECKOUT_API_PRODUCTION to your Render URL.
 * In Render: open your Web Service → copy the URL at the top, e.g.
 *   https://artbyivory-checkout-api.onrender.com
 */
(function () {
  var CHECKOUT_API_PRODUCTION = "https://artbyivory.onrender.com/";

  var h = typeof location !== "undefined" ? location.hostname : "";
  var isLocal = h === "localhost" || h === "127.0.0.1";

  var base = isLocal ? "http://localhost:3001" : String(CHECKOUT_API_PRODUCTION || "").trim();
  window.__CHECKOUT_API_BASE__ = base.replace(/\/$/, "");
})();
