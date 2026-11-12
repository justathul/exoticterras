/* Google Analytics 4. Paste your Measurement ID (looks like G-XXXXXXXXXX) below.
   While it is empty, nothing is loaded and nothing is tracked. */
(function () {
  var GA_ID = "";
  if (!GA_ID || /^(localhost|127\.)/.test(location.hostname)) return;
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag("js", new Date());
  gtag("config", GA_ID, { anonymize_ip: true });
  // count every tap on a WhatsApp link (order / enquire buttons)
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href*='wa.me'],a[href*='whatsapp.com']");
    if (a) gtag("event", "whatsapp_click", { page_path: location.pathname });
  });
})();
