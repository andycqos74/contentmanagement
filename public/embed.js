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

  function iframeForSource(source) {
    var els = document.querySelectorAll("[data-cms-widget]");
    for (var i = 0; i < els.length; i++) {
      if (els[i]._cmsIframe && els[i]._cmsIframe.contentWindow === source) {
        return els[i]._cmsIframe;
      }
    }
    return null;
  }

  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d) return;
    var f = iframeForSource(e.source);
    if (!f) return;

    if (d.type === "cms-widget-height") {
      if (f._cmsOverlay) return; // don't resize while a full-screen overlay is open
      f.style.height = Math.ceil(d.height) + "px";
      return;
    }

    // Lightbox / overlay: expand the iframe to the full viewport so the overlay
    // covers the host page, then restore its normal flow height on close.
    if (d.type === "cms-widget-overlay") {
      if (d.active && !f._cmsOverlay) {
        f._cmsOverlay = true;
        f._cmsPrevHeight = f.style.height;
        f.style.position = "fixed";
        f.style.top = "0";
        f.style.left = "0";
        f.style.right = "0";
        f.style.bottom = "0";
        f.style.width = "100%";
        f.style.height = "100%";
        f.style.zIndex = "2147483647";
      } else if (!d.active && f._cmsOverlay) {
        f._cmsOverlay = false;
        f.style.position = "";
        f.style.top = "";
        f.style.left = "";
        f.style.right = "";
        f.style.bottom = "";
        f.style.zIndex = "";
        f.style.width = "100%";
        f.style.height = f._cmsPrevHeight || "300px";
      }
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAll);
  } else {
    mountAll();
  }
})();
