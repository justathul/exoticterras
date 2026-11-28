/* Cart and "save" controls for the product and category pages.
   Product data is read from the home page (and stock.csv), so prices and stock are edited in one place.
   The cart and saved items use the same browser storage as the home page. */
(function () {
  var BULK = { min: 20, off: 0.10 }; // keep in step with BULK in index.html
  var P = {};

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function button(cls, text) { var b = el("button", cls, text); b.type = "button"; return b; }
  function rupee(n) { return "₹" + n.toLocaleString("en-IN"); }
  function minOf(p) { return p.min || 1; }
  function canBuy(p) { return !!p && !p.enquiry && !p.variants && p.stock !== "out"; }

  function parseProducts(html) {
    html.split("\n").forEach(function (line) {
      var m = line.match(/^\s*\{id:"([^"]+)",cat:"([^"]+)"/);
      if (!m) return;
      function str(k) { var r = line.match(new RegExp("[,{]" + k + ':"([^"]*)"')); return r ? r[1] : ""; }
      function num(k) { var r = line.match(new RegExp("[,{]" + k + ":(\\d+)")); return r ? +r[1] : 0; }
      var v = line.match(/[,{]variants:\[([^\]]*)\]/);
      P[m[1]] = {
        id: m[1], cat: m[2], name: str("name"), price: num("price"), min: num("min"), stock: str("stock"),
        photo: str("photo"),
        enquiry: /[,{]enquiry:(true|1)/.test(line), acc: /[,{]acc:(true|1)/.test(line),
        variants: v ? v[1].match(/[a-z0-9_-]+/gi) : null
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

  var toastEl, toastTimer, bar, barText, headCount;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }

  function refresh() {
    var cart = read("et-cart", {}), count = 0, total = 0;
    Object.keys(cart).forEach(function (id) {
      var p = P[id], q = cart[id];
      if (!p || p.enquiry || !(q > 0)) return;
      var line = p.price * q;
      if (p.cat === "iso" && !p.acc && q >= BULK.min) line = Math.round(line * (1 - BULK.off));
      count += q; total += line;
    });
    headCount.textContent = count;
    barText.textContent = count + (count === 1 ? " item · " : " items · ") + rupee(total);
    bar.hidden = !count;
    document.body.classList.toggle("has-shopbar", !!count);
  }

  function add(id, qty) {
    var p = P[id], cart = read("et-cart", {});
    cart[id] = Math.max((cart[id] || 0) + qty, minOf(p));
    write("et-cart", cart);
    refresh();
    toast("Added " + p.name);
  }

  function saveButton(id, withText) {
    var b = button("sh-save" + (withText ? " wide" : ""));
    function paint() {
      var on = read("et-saved", []).indexOf(id) > -1;
      b.textContent = (on ? "♥" : "♡") + (withText ? (on ? " Saved" : " Save") : "");
      b.setAttribute("aria-pressed", on);
      b.setAttribute("aria-label", (on ? "Remove from saved: " : "Save for later: ") + P[id].name);
    }
    b.addEventListener("click", function () {
      var saved = read("et-saved", []), i = saved.indexOf(id);
      if (i > -1) saved.splice(i, 1); else saved.push(id);
      write("et-saved", saved);
      paint();
    });
    paint();
    return b;
  }

  function productControls() {
    var link = document.querySelector('.ctas a[href^="/#p-"]');
    var ctas = document.querySelector(".dinfo .ctas");
    if (!ctas) return;
    var main = link && P[link.getAttribute("href").slice(4)];
    if (!main) { // sold-out pages have no cart link, so match on the product photo
      var photo = document.querySelector(".dmedia img");
      if (photo) Object.keys(P).some(function (id) { if (P[id].photo === photo.getAttribute("src")) { main = P[id]; return true; } return false; });
    }
    if (!main || main.enquiry) return;
    var box = el("div", "sh-buy"), chosen = main, qty;

    if (main.variants) {
      var label = el("label", "sh-pick", "Choose a variety");
      var select = el("select");
      main.variants.forEach(function (id) {
        var v = P[id];
        if (!v) return;
        var o = el("option", null, v.name + " · " + rupee(v.price) + (v.stock === "out" ? " (sold out)" : ""));
        o.value = id; o.disabled = v.stock === "out";
        select.appendChild(o);
      });
      var first = select.querySelector("option:not([disabled])");
      if (!first) return;
      select.value = first.value; chosen = P[first.value];
      select.addEventListener("change", function () { chosen = P[select.value]; qty = minOf(chosen); out.textContent = qty; });
      label.appendChild(select);
      box.appendChild(label);
    }

    if (canBuy(chosen)) {
      qty = minOf(chosen);
      var stepper = el("div", "sh-qty"), less = button(null, "−"), out = el("span", null, qty), more = button(null, "+");
      less.setAttribute("aria-label", "Fewer"); more.setAttribute("aria-label", "More"); out.setAttribute("aria-live", "polite");
      less.addEventListener("click", function () { qty = Math.max(minOf(chosen), qty - 1); out.textContent = qty; });
      more.addEventListener("click", function () { qty += 1; out.textContent = qty; });
      stepper.append(less, out, more);
      var addBtn = button("sh-add", "Add to cart");
      addBtn.addEventListener("click", function () { add(chosen.id, qty); });
      box.append(stepper, addBtn);
    } else {
      var sold = button("sh-add", "Sold out");
      sold.disabled = true;
      box.appendChild(sold);
    }
    box.appendChild(saveButton(main.id, true));
    ctas.parentNode.insertBefore(box, ctas);
    if (link) link.remove(); // replaced by the controls above
    var order = ctas.querySelector("a.btn.primary");
    if (order && canBuy(chosen)) { // order through the checkout page, where delivery details are filled in
      order.textContent = "Buy now";
      order.href = "/checkout/";
      order.removeAttribute("target");
      order.addEventListener("click", function (e) {
        e.stopPropagation(); // not a WhatsApp tap any more
        var cart = read("et-cart", {});
        cart[chosen.id] = Math.max(cart[chosen.id] || 0, qty);
        write("et-cart", cart);
      });
    }
  }

  function cardControls() {
    var byName = {};
    Object.keys(P).forEach(function (id) { byName[P[id].name] = P[id]; });
    document.querySelectorAll("a.rcard").forEach(function (card) {
      var title = card.querySelector("b"), pic = card.querySelector("img"), p = null;
      // match on the photo first: card titles can differ from product names ("Zebra Isopod")
      if (pic) Object.keys(P).some(function (id) { if (P[id].photo === pic.getAttribute("src")) { p = P[id]; return true; } return false; });
      if (!p && title) p = byName[title.textContent.trim().replace(/ Isopod$/, "")];
      if (!p) return;
      var wrap = el("div", "sh-card");
      card.parentNode.insertBefore(wrap, card);
      wrap.appendChild(card);
      wrap.appendChild(saveButton(p.id, false));
      if (p.enquiry) return;
      var b;
      if (p.variants) { b = el("a", "sh-add", "Choose"); b.href = card.getAttribute("href"); }
      else {
        b = button("sh-add", p.stock === "out" ? "Sold out" : "+ Add");
        b.disabled = p.stock === "out";
        b.setAttribute("aria-label", (b.disabled ? "Sold out: " : "Add to cart: ") + p.name);
        b.addEventListener("click", function () { add(p.id, minOf(p)); });
      }
      wrap.appendChild(b);
    });
  }

  var CSS = [
    ".sh-buy{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 14px}",
    ".sh-buy button,.sh-card button,.sh-card .sh-add,.sh-pick select{font:inherit;cursor:pointer}",
    ".sh-qty{display:inline-flex;align-items:center;background:var(--chip);border-radius:14px;padding:3px}",
    ".sh-qty button{width:42px;height:44px;border:0;background:none;color:var(--ink);font-weight:800;font-size:1.15rem}",
    ".sh-qty span{min-width:30px;text-align:center;font-weight:800}",
    ".sh-add{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 22px;border:0;border-radius:14px;background:var(--teal);color:#0B1A08;font-weight:800;text-decoration:none}",
    ".sh-buy .sh-add{flex:1;min-width:150px}",
    ".sh-add:disabled{background:var(--chip);color:var(--muted);cursor:not-allowed}",
    ".sh-save{min-width:44px;min-height:44px;border:1px solid var(--line);border-radius:14px;background:rgba(8,16,12,.78);color:var(--ink);font-weight:800}",
    ".sh-save.wide{min-height:48px;padding:0 18px}.sh-save[aria-pressed=true]{color:#FF8FA3;border-color:#FF8FA3}",
    ".sh-pick{flex-basis:100%;font-weight:700;font-size:.9rem}.sh-pick select{display:block;width:100%;margin-top:6px;min-height:48px;padding:0 12px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--ink)}",
    ".sh-card{position:relative;display:flex;flex-direction:column;gap:8px;min-width:0}.sh-card>.rcard{flex:1}",
    ".sh-card>.sh-save{position:absolute;top:8px;right:8px;border-radius:50%}",
    ".sh-cart{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}.sh-cart b{min-width:24px;padding:1px 7px;border-radius:999px;background:var(--teal);color:#0B1A08;text-align:center;font-size:.8rem}",
    ".sh-bar{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));max-width:440px;margin:auto;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 10px 10px 18px;border:1px solid var(--teal);border-radius:18px;background:var(--surface);color:var(--ink);font-weight:800;box-shadow:0 14px 34px rgba(0,0,0,.5)}",
    ".sh-bar[hidden]{display:none}.sh-bar a{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:12px;background:var(--teal);color:#0B1A08;text-decoration:none}",
    "body.has-shopbar{padding-bottom:90px}",
    ".sh-toast{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:21;padding:10px 18px;border-radius:999px;background:#E7C46B;color:#1B1200;font-weight:800;opacity:0;visibility:hidden;transition:opacity .2s;max-width:90vw;text-align:center}",
    ".sh-toast.show{opacity:1;visibility:visible}"
  ].join("");

  function start() {
    var style = el("style"); style.textContent = CSS; document.head.appendChild(style);
    toastEl = el("div", "sh-toast"); toastEl.setAttribute("role", "status");
    bar = el("div", "sh-bar"); bar.hidden = true; barText = el("span");
    var view = el("a", null, "View cart"); view.href = "/#cart";
    bar.append(barText, view);
    document.body.append(toastEl, bar);
    var headLink = el("a", "sh-cart", "Cart "); headLink.href = "/#cart"; headCount = el("b", null, "0");
    headLink.appendChild(headCount);
    var nav = document.querySelector("header nav");
    if (nav) nav.appendChild(headLink);
    productControls();
    cardControls();
    refresh();
    addEventListener("pageshow", refresh);
    addEventListener("storage", refresh);
  }

  Promise.all([
    fetch("/").then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }),
    fetch("/stock.csv", { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : ""; }).catch(function () { return ""; })
  ]).then(function (res) {
    parseProducts(res[0]);
    if (!Object.keys(P).length) return; // leave the page's WhatsApp order button as it is
    if (res[1]) applyStock(res[1]);
    start();
  }).catch(function () {});
})();
