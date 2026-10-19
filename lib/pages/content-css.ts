// Typography for page HTML. Used verbatim by the server-rendered /p/[slug] page
// and by embed.js (inside a Shadow DOM, where it can't leak into or be broken by
// the host site's CSS). Keep in sync with PAGE_CSS in public/embed.js.
export const PAGE_CONTENT_CSS = `
.cms-page{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.65;color:#1d2939;overflow-wrap:anywhere}
.cms-page img,.cms-page video,.cms-page iframe{max-width:100%;height:auto}
.cms-page iframe{aspect-ratio:16/9;width:100%}
.cms-page h1,.cms-page h2,.cms-page h3,.cms-page h4{line-height:1.25;margin:1.4em 0 .5em}
.cms-page p{margin:0 0 1em}
.cms-page a{color:#0a4b93}
.cms-page ul,.cms-page ol{padding-left:1.5em;margin:0 0 1em}
.cms-page table{border-collapse:collapse;max-width:100%}
.cms-page td,.cms-page th{border:1px solid #d0d5dd;padding:6px 10px}
.cms-page blockquote{border-left:4px solid #d0d5dd;margin:1em 0;padding:.2em 1em;color:#475467}
.cms-page figure{margin:1em 0}.cms-page figcaption{font-size:.875em;color:#667085}
`;
