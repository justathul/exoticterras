/* Google Tag Manager. Loaded on every page via this file.
   GA4 and other tags are configured inside the GTM container (tagmanager.google.com). */
(function () {
  var GTM_ID = "GTM-N2XQNB45";
  if (!GTM_ID || /^(localhost|127\.)/.test(location.hostname)) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(GTM_ID);
  document.head.appendChild(s);
  // count every tap on a WhatsApp link (order / enquire buttons); use a Custom Event trigger "whatsapp_click" in GTM
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href*='wa.me'],a[href*='whatsapp.com']");
    if (a) window.dataLayer.push({ event: "whatsapp_click", page_path: location.pathname });
  });
})();
