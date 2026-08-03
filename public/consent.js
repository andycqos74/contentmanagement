/* Cookie consent loader (for COOKIE_CONSENT widgets).
 * Usage on any website:
 *   <script src="https://YOUR_HOST/consent.js" data-cms-widget="WIDGET_ID" async></script>
 *
 * Renders a consent bar in the host page (Shadow DOM), stores the choice in the
 * host's localStorage, and signals the site so it can enable/disable tracking:
 *   - window event:  window.addEventListener('cms-cookie-consent', e => e.detail)
 *   - callback:      window.cmsCookieConsent = data => { ... }
 *   - dataLayer:     pushes { event:'cms_cookie_consent', consent:{...} } if present
 * Non-essential categories default to OFF; nothing is set until the user chooses.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var id = script.getAttribute("data-cms-widget");
  if (!id) return;
  var origin = "";
  try {
    origin = new URL(script.src).origin;
  } catch {
    origin = "";
  }
  var KEY = "cms-cookie-consent:" + id;
  var hostEl = null;

  // Mirror of lib/widgets/fonts.ts (id -> css stack + optional Google family).
  var FONTS = {
    system: { stack: "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" },
    inter: { stack: "'Inter',system-ui,sans-serif", google: "Inter:wght@400;500;600;700;800" },
    roboto: { stack: "'Roboto',system-ui,sans-serif", google: "Roboto:wght@400;500;700;900" },
    opensans: { stack: "'Open Sans',system-ui,sans-serif", google: "Open+Sans:wght@400;500;600;700;800" },
    montserrat: { stack: "'Montserrat',system-ui,sans-serif", google: "Montserrat:wght@400;500;600;700;800" },
    poppins: { stack: "'Poppins',system-ui,sans-serif", google: "Poppins:wght@400;500;600;700;800" },
    oswald: { stack: "'Oswald',system-ui,sans-serif", google: "Oswald:wght@400;500;600;700" },
    lato: { stack: "'Lato',system-ui,sans-serif", google: "Lato:wght@400;700;900" },
    raleway: { stack: "'Raleway',system-ui,sans-serif", google: "Raleway:wght@400;500;600;700;800" },
    playfair: { stack: "'Playfair Display',Georgia,serif", google: "Playfair+Display:wght@400;500;600;700;800" },
    merriweather: { stack: "'Merriweather',Georgia,serif", google: "Merriweather:wght@400;700;900" },
    lora: { stack: "'Lora',Georgia,serif", google: "Lora:wght@400;500;600;700" },
  };
  function fontDef(fid) {
    return FONTS[fid] || FONTS.system;
  }
  function fontStack(fid) {
    return fontDef(fid).stack;
  }
  function loadFont(fid) {
    var f = fontDef(fid);
    if (!f.google) return;
    var domId = "cms-font-" + (fid || "system");
    if (document.getElementById(domId)) return;
    try {
      var link = document.createElement("link");
      link.id = domId;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=" + f.google + "&display=swap";
      document.head.appendChild(link);
    } catch {}
  }

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null");
    } catch {
      return null;
    }
  }
  function signal(data) {
    try {
      window.dispatchEvent(new CustomEvent("cms-cookie-consent", { detail: data }));
    } catch {}
    if (typeof window.cmsCookieConsent === "function") {
      try {
        window.cmsCookieConsent(data);
      } catch {}
    }
    try {
      if (window.dataLayer)
        window.dataLayer.push({ event: "cms_cookie_consent", consent: data.categories });
    } catch {}
  }
  function save(categories, version) {
    var data = { version: String(version), at: new Date().toISOString(), categories: categories };
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
    signal(data);
    return data;
  }
  function allCats(s, val) {
    var o = {};
    (s.categories || []).forEach(function (c) {
      o[c.key] = c.required ? true : val;
    });
    return o;
  }
  function remove() {
    if (hostEl && hostEl.parentNode) hostEl.parentNode.removeChild(hostEl);
    hostEl = null;
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function styles(s, isBar, pos) {
    var accent = s.accentColor || "#094582";
    var font = fontStack(s.fontFamily);
    var wrapPos =
      pos === "top"
        ? "top:0;left:0;right:0;"
        : pos === "bottom-left"
          ? "bottom:16px;left:16px;"
          : pos === "bottom-right"
            ? "bottom:16px;right:16px;"
            : "bottom:0;left:0;right:0;";
    var radius = isBar ? "0" : (s.rounded || 12) + "px";
    return (
      ".cc-wrap{position:fixed;z-index:2147483647;" +
      wrapPos +
      "}" +
      ".cc-card{background:" +
      (s.bgColor || "#fff") +
      ";color:" +
      (s.textColor || "#1e293b") +
      ";border-radius:" +
      radius +
      ";box-shadow:0 6px 30px rgba(0,0,0,.18);padding:18px 20px;max-width:" +
      (isBar ? "100%" : "420px") +
      ";box-sizing:border-box;font-family:" +
      font +
      "}" +
      ".cc-main{display:flex;gap:20px;align-items:center;flex-wrap:wrap}" +
      (isBar ? "" : ".cc-main{flex-direction:column;align-items:stretch}") +
      ".cc-text{flex:1;min-width:240px}" +
      ".cc-title{font-weight:700;font-size:16px;margin-bottom:5px}" +
      ".cc-msg{font-size:14px;line-height:1.5;opacity:.9}" +
      ".cc-policy{color:" +
      accent +
      ";text-decoration:underline}" +
      ".cc-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}" +
      ".cc-actions button{border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}" +
      ".cc-manage{background:transparent !important;color:inherit !important;border:1px solid rgba(100,116,139,.4) !important}" +
      ".cc-reject{background:#64748b;color:#fff}" +
      ".cc-accept{background:" +
      accent +
      ";color:" +
      (s.buttonTextColor || "#fff") +
      "}" +
      ".cc-prefs{margin-top:14px}" +
      ".cc-cat{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid rgba(100,116,139,.2)}" +
      ".cc-cat-label{font-weight:600;font-size:14px;display:block}" +
      ".cc-cat-desc{font-size:13px;opacity:.7;display:block;margin-top:2px}" +
      ".cc-prefs-actions{justify-content:flex-end;margin-top:12px}"
    );
  }

  function render(s, existing) {
    remove();
    hostEl = document.createElement("div");
    document.body.appendChild(hostEl);
    var root = hostEl.attachShadow({ mode: "open" });
    var pos = s.position || "bottom";
    var isBar = (s.layout || "bar") === "bar" && (pos === "bottom" || pos === "top");

    var policy = s.policyUrl
      ? ' <a class="cc-policy" href="' +
        esc(s.policyUrl) +
        '" target="_blank" rel="noopener">' +
        esc(s.policyText) +
        "</a>"
      : "";
    var actions =
      (s.showCustomize ? '<button class="cc-manage" type="button">' + esc(s.customizeText) + "</button>" : "") +
      (s.showReject ? '<button class="cc-reject" type="button">' + esc(s.rejectText) + "</button>" : "") +
      '<button class="cc-accept" type="button">' + esc(s.acceptText) + "</button>";
    var cats = (s.categories || [])
      .map(function (c) {
        var on = c.required || (existing && existing.categories && existing.categories[c.key]);
        return (
          '<label class="cc-cat"><input type="checkbox" data-key="' +
          esc(c.key) +
          '" ' +
          (on ? "checked" : "") +
          " " +
          (c.required ? "disabled" : "") +
          "/><span><span class=\"cc-cat-label\">" +
          esc(c.label) +
          (c.required ? " (always on)" : "") +
          "</span>" +
          (c.description ? '<span class="cc-cat-desc">' + esc(c.description) + "</span>" : "") +
          "</span></label>"
        );
      })
      .join("");

    root.innerHTML =
      "<style>" +
      styles(s, isBar, pos) +
      "</style>" +
      '<div class="cc-wrap"><div class="cc-card">' +
      '<div class="cc-main"><div class="cc-text">' +
      (s.title ? '<div class="cc-title">' + esc(s.title) + "</div>" : "") +
      '<div class="cc-msg">' +
      esc(s.message) +
      policy +
      "</div></div>" +
      '<div class="cc-actions">' +
      actions +
      "</div></div>" +
      '<div class="cc-prefs" hidden><div class="cc-cats">' +
      cats +
      '</div><div class="cc-actions cc-prefs-actions"><button class="cc-save" type="button">' +
      esc(s.saveText) +
      "</button></div></div></div></div>";

    var q = function (sel) {
      return root.querySelector(sel);
    };
    function close() {
      remove();
      if (s.showReopen) renderReopen(s);
    }
    q(".cc-accept").addEventListener("click", function () {
      save(allCats(s, true), s.version);
      close();
    });
    if (s.showReject)
      q(".cc-reject").addEventListener("click", function () {
        save(allCats(s, false), s.version);
        close();
      });
    if (s.showCustomize)
      q(".cc-manage").addEventListener("click", function () {
        q(".cc-prefs").hidden = false;
        q(".cc-main .cc-actions").style.display = "none";
      });
    var saveBtn = q(".cc-save");
    if (saveBtn)
      saveBtn.addEventListener("click", function () {
        var o = {};
        root.querySelectorAll(".cc-cat input").forEach(function (inp) {
          o[inp.getAttribute("data-key")] = inp.checked || inp.disabled;
        });
        save(o, s.version);
        close();
      });
  }

  function renderReopen(s) {
    remove();
    hostEl = document.createElement("div");
    document.body.appendChild(hostEl);
    var root = hostEl.attachShadow({ mode: "open" });
    root.innerHTML =
      "<style>.cc-reopen{position:fixed;bottom:16px;left:16px;z-index:2147483646;background:" +
      (s.accentColor || "#094582") +
      ";color:" +
      (s.buttonTextColor || "#fff") +
      ";border:none;border-radius:20px;padding:8px 14px;font:600 13px " +
      fontStack(s.fontFamily) +
      ";cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.2)}</style>" +
      '<button class="cc-reopen" type="button">' +
      esc(s.reopenText || "Cookie settings") +
      "</button>";
    root.querySelector(".cc-reopen").addEventListener("click", function () {
      render(s, read());
    });
  }

  function start(s) {
    loadFont(s.fontFamily);
    var existing = read();
    if (existing && String(existing.version) === String(s.version)) {
      signal(existing);
      if (s.showReopen) renderReopen(s);
      return;
    }
    if (document.body) render(s, existing);
    else document.addEventListener("DOMContentLoaded", function () { render(s, existing); });
  }

  fetch(origin + "/api/widgets/" + encodeURIComponent(id))
    .then(function (r) {
      return r.json();
    })
    .then(function (w) {
      if (w && w.type === "COOKIE_CONSENT" && w.settings) start(w.settings);
    })
    .catch(function () {});
})();
