/* Widget CMS embed loader.
 * Usage on any website:
 *   <div data-cms-widget="WIDGET_ID"></div>
 *   <script src="https://YOUR_HOST/embed.js" async></script>
 * Injects a responsive, auto-resizing iframe for each placeholder.
 *
 * Pages (WYSIWYG content) are rendered inline - no iframe:
 *   <div data-cms-page="PAGE_SLUG"></div>
 *   <script src="https://YOUR_HOST/embed.js" async></script>
 * The published HTML is fetched from /api/pages/SLUG and placed in a Shadow DOM,
 * so it inherits the host page's width/flow but its styling is isolated both
 * ways. Add data-cms-title="true" to also show the page title as an <h1>.
 */
(function () {
  var current = document.currentScript;
  var origin = "";
  try {
    // Prefer an explicit data-cms-origin attribute so the correct CMS URL is
    // always used regardless of how/when the script is executed (async, deferred,
    // dynamically injected). Falls back to deriving the origin from the script src.
    var explicitOrigin = current && current.getAttribute("data-cms-origin");
    if (explicitOrigin) {
      origin = new URL(explicitOrigin).origin;
    } else {
      origin = new URL(current.src).origin;
    }
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

  function mountPage(el) {
    if (el.getAttribute("data-cms-mounted")) return;
    var slug = el.getAttribute("data-cms-page");
    if (!slug) return;
    el.setAttribute("data-cms-mounted", "1");

    fetch(origin + "/api/pages/" + encodeURIComponent(slug))
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (page) {
        var root = el.attachShadow ? el.attachShadow({ mode: "open" }) : el;
        var style = document.createElement("style");
        style.textContent = ":host{display:block}" + (page.css || "");
        var body = document.createElement("div");
        body.className = "cms-page";
        if (el.getAttribute("data-cms-title") === "true") {
          var h = document.createElement("h1");
          h.textContent = page.title;
          body.appendChild(h);
        }
        var content = document.createElement("div");
        content.innerHTML = page.html; // sanitised server-side on save/publish
        body.appendChild(content);
        root.appendChild(style);
        root.appendChild(body);
      })
      .catch(function () {
        el.removeAttribute("data-cms-mounted");
      });
  }

  function mountAll() {
    var els = document.querySelectorAll("[data-cms-widget]");
    for (var i = 0; i < els.length; i++) mount(els[i]);
    var pages = document.querySelectorAll("[data-cms-page]");
    for (var j = 0; j < pages.length; j++) mountPage(pages[j]);
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
