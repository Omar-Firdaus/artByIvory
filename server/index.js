/**
 * Square Payments proxy for Art by Ivory static checkout.
 * Keeps SQUARE_ACCESS_TOKEN off the browser. Run: npm install && npm start
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 3001;
const SQUARE_VERSION = "2024-11-20";

/** USD cents per cart line id — must match product pages */
const CATALOG_CENTS = {
  "kinco-mittens-classic": 5200,
  "kinco-gloves": 4800,
  "ivory-goon-coin": 100,
};

function squareBaseUrl() {
  return process.env.SQUARE_ENV === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

function totalCentsFromCart(cart) {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error("Cart is empty");
  }
  var total = 0;
  for (var i = 0; i < cart.length; i++) {
    var line = cart[i];
    var id = line && line.id;
    var unit = CATALOG_CENTS[id];
    if (unit === undefined) {
      throw new Error("Unknown product id: " + (id || "(missing)") + ". Add it to CATALOG_CENTS in server/index.js.");
    }
    var qty = parseInt(line.qty, 10) || 1;
    qty = Math.max(1, Math.min(99, qty));
    total += unit * qty;
  }
  return total;
}

/** Comma-separated allowed page origins (required for real domains in production). */
function explicitCorsOrigins() {
  return (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
}

function corsOriginCallback(origin, callback) {
  if (!origin) {
    return callback(null, true);
  }
  var explicit = explicitCorsOrigins();
  if (explicit.indexOf(origin) !== -1) {
    return callback(null, true);
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return callback(null, true);
  }
  if (process.env.STRICT_CORS === "true") {
    return callback(new Error("Origin not in CLIENT_ORIGIN"));
  }
  // Not strict: allow other origins (e.g. Vercel) so checkout works without listing every preview URL.
  // For production hardening, set STRICT_CORS=true and list exact origins in CLIENT_ORIGIN.
  return callback(null, true);
}

var app = express();
app.use(express.json({ limit: "256kb" }));
app.use(
  cors({
    origin: corsOriginCallback,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
  })
);

app.get("/health", function (_req, res) {
  res.json({ ok: true });
});

app.get("/api/square/config", function (_req, res) {
  var applicationId = (process.env.SQUARE_APPLICATION_ID || "").trim();
  var locationId = (process.env.SQUARE_LOCATION_ID || "").trim();
  var environment = process.env.SQUARE_ENV === "production" ? "production" : "sandbox";
  if (!applicationId || !locationId) {
    return res.status(503).json({ error: "Square application or location id missing on server." });
  }
  res.json({ applicationId: applicationId, locationId: locationId, environment: environment });
});

app.post("/api/square/pay", async function (req, res) {
  var token = (process.env.SQUARE_ACCESS_TOKEN || "").trim();
  if (!token) {
    return res.status(503).json({ error: "SQUARE_ACCESS_TOKEN not set." });
  }

  var body = req.body || {};
  var sourceId = body.sourceId;
  var idempotencyKey = body.idempotencyKey;
  var cart = body.cart;
  var buyer = body.buyer;

  if (!sourceId || typeof sourceId !== "string") {
    return res.status(400).json({ error: "Missing sourceId." });
  }
  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    return res.status(400).json({ error: "Missing idempotencyKey." });
  }
  if (!buyer || typeof buyer !== "object") {
    return res.status(400).json({ error: "Missing buyer." });
  }

  var amountCents;
  try {
    amountCents = totalCentsFromCart(cart);
  } catch (e) {
    return res.status(400).json({ error: e.message || "Invalid cart" });
  }

  var name = String(buyer.name || "").trim().slice(0, 120);
  var email = String(buyer.email || "").trim().slice(0, 254);
  var address = String(buyer.address || "").trim();
  var city = String(buyer.city || "").trim();
  var state = String(buyer.state || "").trim();
  var zip = String(buyer.zip || "").trim();
  var notes = String(buyer.notes || "").trim().slice(0, 400);

  if (!name || !email || !address || !city || !state || !zip) {
    return res.status(400).json({ error: "Incomplete shipping or contact fields." });
  }

  var lines = (cart || [])
    .map(function (l) { return (l.title || l.id) + " x" + (l.qty || 1); })
    .join("; ")
    .slice(0, 200);

  var note =
    "Ship to: " + name + "\n" + address + "\n" + city + ", " + state + " " + zip + "\n" +
    (notes ? "Notes: " + notes + "\n" : "") +
    "Items: " + lines;

  var referenceId = ("abi-" + crypto.randomBytes(6).toString("hex")).slice(0, 40);

  var payload = {
    idempotency_key: idempotencyKey.slice(0, 128),
    source_id: sourceId,
    amount_money: { amount: amountCents, currency: "USD" },
    autocomplete: true,
    buyer_email_address: email,
    note: note.slice(0, 500),
    reference_id: referenceId,
  };

  try {
    var sqRes = await fetch(squareBaseUrl() + "/v2/payments", {
      method: "POST",
      headers: {
        "Square-Version": SQUARE_VERSION,
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    var data = await sqRes.json().catch(function () { return {}; });

    if (!sqRes.ok) {
      var err0 = data.errors && data.errors[0];
      var msg = (err0 && err0.detail) || (err0 && err0.code) || "Square error " + sqRes.status;
      return res.status(402).json({ error: msg, squareErrors: data.errors || data });
    }

    var payment = data.payment;
    return res.json({
      ok: true,
      paymentId: payment && payment.id,
      receiptUrl: payment && payment.receipt_url,
      referenceId: referenceId,
      amountCents: amountCents,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Payment failed. Try again." });
  }
});

app.listen(PORT, function () {
  console.log("Checkout API http://localhost:" + PORT);
  console.log("Square:", process.env.SQUARE_ENV === "production" ? "production" : "sandbox");
});
