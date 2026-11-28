/* Checkout page. Products come from the home page and stock.csv, the cart from the same
   browser storage as the shop. The order is sent as a WhatsApp message. */
(function () {
  var WHATSAPP = "919074282206";
  var BULK = { min: 20, off: 0.10 }; // keep in step with BULK in index.html
  var P = {}, lines = [], total = 0;
  var $ = function (id) { return document.getElementById(id); };
  var form = $("co");
  var FIELDS = ["name", "phone", "email", "street", "city", "state", "pin", "note"];

  function read(store, key, fallback) {
    try { return JSON.parse(window[store].getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function rupee(n) { return "₹" + n.toLocaleString("en-IN"); }
  function el(tag, text) { var n = document.createElement(tag); if (text != null) n.textContent = text; return n; }

  function parseProducts(html) {
    html.split("\n").forEach(function (line) {
      var m = line.match(/^\s*\{id:"([^"]+)",cat:"([^"]+)"/);
      if (!m) return;
      function str(k) { var r = line.match(new RegExp("[,{]" + k + ':"([^"]*)"')); return r ? r[1] : ""; }
      var price = line.match(/[,{]price:(\d+)/);
      P[m[1]] = {
        cat: m[2], name: str("name"), unit: str("unit"), photo: str("photo"), parent: str("variantOf"), stock: str("stock"),
        price: price ? +price[1] : 0,
        enquiry: /[,{]enquiry:(true|1)/.test(line), acc: /[,{]acc:(true|1)/.test(line)
      };
    });
  }

  function applyStock(csv) {
    var words = { "stock": "in", "in stock": "in", "in": "in", "available": "in", "yes": "in", "limited stock": "low", "limited": "low", "few left": "low", "only a few left": "low", "low": "low", "stockout": "out", "stock out": "out", "out of stock": "out", "sold out": "out", "out": "out" };
    var rows = csv.split(/\r?\n/).map(function (r) { return r.split(","); });
    var head = rows.shift().map(function (h) { return h.trim().toLowerCase(); });
    var iId = head.indexOf("id"), iPrice = head.indexOf("price"), iStock = head.indexOf("stock");
    rows.forEach(function (r) {
      var p = P[(r[iId] || "").trim()];
      if (!p) return;
      var st = words[(r[iStock] || "").trim().toLowerCase()];
      var price = parseFloat((r[iPrice] || "").replace(/[^\d.]/g, ""));
      if (st) p.stock = st;
      if (price > 0) p.price = price;
    });
  }

  function render() {
    var cart = read("localStorage", "et-cart", {}), skipped = [], subtotal = 0, discount = 0;
    lines = [];
    $("items").textContent = "";
    Object.keys(cart).forEach(function (id) {
      var p = P[id], q = cart[id];
      if (!p || p.enquiry || !(q > 0)) return;
      if (p.stock === "out") { skipped.push(p.name); return; }
      var full = p.price * q, off = 0;
      if (p.cat === "iso" && !p.acc && q >= BULK.min) off = full - Math.round(full * (1 - BULK.off));
      subtotal += full; discount += off;
      lines.push("• " + p.name + " (" + p.unit + ") × " + q + " = " + rupee(full - off) + (off ? " (10% bulk discount)" : ""));
      var li = el("li"), img = el("img"), info = el("div");
      img.src = p.photo || (P[p.parent] || {}).photo || "/images/favicon.png"; img.alt = ""; img.width = img.height = 56;
      info.append(el("b", p.name), el("small", q + " × " + rupee(p.price) + " · " + p.unit));
      li.append(img, info, el("b", rupee(full)));
      $("items").appendChild(li);
    });
    total = subtotal - discount;
    $("sub").textContent = rupee(subtotal);
    $("discrow").hidden = !discount;
    $("disc").textContent = "−" + rupee(discount);
    $("total").textContent = rupee(total);
    $("skipped").hidden = !skipped.length;
    $("skipped").textContent = "Sold out and left out of this order: " + skipped.join(", ");
    $("empty").hidden = !!(lines.length || skipped.length);
    $("cogrid").hidden = !(lines.length || skipped.length);
    $("place").disabled = !lines.length;
  }

  function value(id) { return $(id).value.trim(); }
  function phoneOf(v) { return v.replace(/[\s-]/g, "").replace(/^(\+91|91(?=\d{10}$)|0)/, ""); }

  function problem() {
    var checks = [
      ["name", value("name").length > 1, "Enter your full name."],
      ["phone", /^[6-9]\d{9}$/.test(phoneOf(value("phone"))), "Enter a valid 10-digit mobile number."],
      ["email", !value("email") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email")), "Check your email address, or leave it empty."],
      ["street", value("street").length > 3, "Enter your house name and street."],
      ["city", value("city").length > 1, "Enter your city or town."],
      ["pin", /^[1-9]\d{5}$/.test(value("pin")), "Enter a valid 6-digit pin code."]
    ];
    var first = null;
    checks.forEach(function (c) {
      $(c[0]).setAttribute("aria-invalid", !c[1]);
      if (!c[1] && !first) first = c;
    });
    return first;
  }

  // keep what was typed if the page is reloaded; cleared when the tab is closed
  var kept = read("sessionStorage", "et-checkout", {});
  try { if (!kept.pin) kept.pin = localStorage.getItem("et-pin") || ""; } catch (e) {}
  FIELDS.forEach(function (id) { if (kept[id]) $(id).value = kept[id]; });
  form.addEventListener("input", function () {
    var data = {};
    FIELDS.forEach(function (id) { data[id] = $(id).value; });
    try { sessionStorage.setItem("et-checkout", JSON.stringify(data)); } catch (e) {}
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    render(); // the cart may have changed in another tab
    if (!lines.length) return;
    var bad = problem();
    $("err").hidden = !bad;
    if (bad) { $("err").textContent = bad[2]; $(bad[0]).focus(); return; }
    var msg = "Hi Exotic Terras, I’d like to order:\n" + lines.join("\n") +
      "\nTotal before shipping: " + rupee(total) +
      "\n\nName: " + value("name") +
      "\nPhone: " + phoneOf(value("phone")) +
      (value("email") ? "\nEmail: " + value("email") : "") +
      "\nAddress: " + value("street") + ", " + value("city") + ", " + value("state") + " - " + value("pin") +
      (value("note") ? "\nNote: " + value("note") : "") +
      "\n\nPlease confirm the shipping cost.";
    // opened from script, not a link, so click tracking never sees the address in a URL
    if (window.dataLayer) window.dataLayer.push({ event: "whatsapp_click", page_path: location.pathname });
    location.href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(msg);
  });

  Promise.all([
    fetch("/").then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }),
    fetch("/stock.csv", { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : ""; }).catch(function () { return ""; })
  ]).then(function (res) {
    parseProducts(res[0]);
    if (res[1]) applyStock(res[1]);
    render();
    addEventListener("storage", render);
    addEventListener("pageshow", render);
  }).catch(function () {
    $("empty").hidden = false;
    $("empty").textContent = "We couldn’t load your order. Please refresh the page.";
  });
})();
