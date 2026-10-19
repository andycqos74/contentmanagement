// Pages are authored in TinyMCE and served to the public (server-rendered and
// injected into host sites), so HTML is whitelisted on save/publish: no
// scripts, event handlers or javascript: URLs ever reach a visitor.
import sanitizeHtml from "sanitize-html";

export function sanitizePageHtml(html: string): string {
  return sanitizeHtml(html ?? "", {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img", "figure", "figcaption", "h1", "h2", "span", "u", "s", "sub", "sup",
      "iframe", "video", "source", "caption", "colgroup", "col", "hr",
    ],
    allowedAttributes: {
      "*": ["style", "class", "id", "title", "lang", "dir"],
      a: ["href", "name", "target", "rel"],
      img: ["src", "srcset", "alt", "width", "height", "loading"],
      video: ["src", "controls", "poster", "width", "height"],
      source: ["src", "type"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "frameborder"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
      col: ["span", "width"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    // Embedded media (TinyMCE "media") only from known video hosts.
    allowedIframeHostnames: [
      "www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com",
    ],
    // Inline styles limited to typographic/layout properties.
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i, /^[a-z]+$/i],
        "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i, /^[a-z]+$/i],
        "text-align": [/^(left|right|center|justify)$/],
        "font-weight": [/^(normal|bold|\d{3})$/],
        "font-style": [/^(normal|italic)$/],
        "text-decoration": [/^[a-z\s-]+$/],
        width: [/^\d+(\.\d+)?(px|%|em|rem)$/],
        height: [/^\d+(\.\d+)?(px|%|em|rem)$/],
        "padding-left": [/^\d+(\.\d+)?(px|%|em|rem)$/],
        float: [/^(left|right|none)$/],
        margin: [/^[\d\s.a-z%-]+$/],
      },
    },
    transformTags: {
      // Links that open a new tab must not hand the opener to the target.
      a: (tag, attribs) => ({
        tagName: tag,
        attribs: attribs.target ? { ...attribs, rel: "noopener noreferrer" } : attribs,
      }),
    },
  });
}

// Lower-case, hyphenated URL slug; empty string when nothing usable remains.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
