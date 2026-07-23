/* Widget CMS embed loader.
 * Usage on any website:
 *   <div data-cms-widget="WIDGET_ID"></div>
 *   <script src="https://YOUR_HOST/embed.js" async></script>
 * Injects a responsive, auto-resizing iframe for each placeholder.
 */
(function () {
  var current = document.currentScript;
  var origin = "";
  try {
    origin = new URL(current.src).origin;
  } catch {
    origin = "";
  }

  function mount(el) {
    if (el.getAttribute("data-cms-mounted")) return;
    var id = el.getAttribute("data-cms-widget");
    if (!id) return;
    el.setAttribute("data-cms-mounted", "1");

    var iframe = document.createElement("iframe");
    iframe.src = origin + "/embed/" + encodeURIComponent(id);
    iframe.title = "Embedded widget";
    iframe.loading = "lazy";
    iframe.setAttribute("scrolling", "no");
    iframe.style.width = "100%";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.style.overflow = "hidden";
    iframe.style.height = "300px";
    el.appendChild(iframe);
    el._cmsIframe = iframe;
  }

  function mountAll() {
    var els = document.querySelectorAll("[data-cms-widget]");
    for (var i = 0; i < els.length; i++) mount(els[i]);
  }

  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.type !== "cms-widget-height") return;
    var els = document.querySelectorAll("[data-cms-widget]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el._cmsIframe && el._cmsIframe.contentWindow === e.source) {
        el._cmsIframe.style.height = Math.ceil(d.height) + "px";
      }
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAll);
  } else {
    mountAll();
  }
})();
