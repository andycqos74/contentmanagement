# Widget CMS (`contentmanagement`)

A small, Elfsight-style CMS for building **embeddable website widgets**. Create a
widget in a clean admin UI, configure its content and design with a live preview,
then paste a one-line snippet into any website. Each widget's content can be
**entered manually** or **driven from a MySQL database** (read-only).

Built for general website use (first widgets: **Hero Slider** and **Latest News**),
with Queen of the South FC (qosfc.com) as the reference site.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** for the admin UI
- **Prisma 6** + **MySQL** for the CMS content database
- **mysql2** for read-only connections to external ("website") databases
- **jose** for session auth, **bcryptjs** for password hashing
- **AES-256-GCM** to encrypt stored data-source passwords

## Architecture

| Piece | Path | What it does |
| --- | --- | --- |
| Admin dashboard | `app/(admin)/**` | List, create and edit widgets; manage data sources |
| Widget editor | `app/(admin)/widgets/[id]/**` | Two-pane editor: content/design/embed tabs + live preview |
| Public JSON API | `app/api/widgets/[id]/route.ts` | CORS-enabled published widget payload |
| Embed render | `app/embed/[id]/page.tsx` | SSR of a single widget (loaded inside the iframe) |
| Embed loader | `public/embed.js` | Injects a responsive, auto-resizing iframe on the host page |
| Widget registry | `lib/widgets/registry.ts` | One source of truth: settings/item schemas, defaults, data fields |
| Render components | `components/widgets/**` | Shared render used by preview **and** embed |
| Safe query layer | `lib/datasource/**` | Pooled read-only access, whitelisted-identifier SELECT builder, introspection |

Widgets have a **draft** working copy and a **published snapshot**; live embeds always
serve the snapshot, so edits are invisible until you re-publish.

## Quick start

Requires Node 20+ and a MySQL server. A `docker-compose.yml` is provided, or use any
MySQL/MariaDB.

```bash
# 1. Install
npm install

# 2. Database — either:
docker compose up -d            # starts MySQL with a `cms` DB + a sample `website` DB
# ...or point DATABASE_URL at your own MySQL and create a `cms` database.

# 3. Configure
cp .env.example .env            # then fill in the values (secrets, DATABASE_URL)
#   generate secrets:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"  # AUTH_SECRET
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"     # DATASOURCE_ENC_KEY

# 4. Schema + demo data
npm run db:push
npm run db:seed                 # creates the admin user + demo widgets

# 5. Run
npm run dev                     # http://localhost:3000
```

Sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from your `.env`.

## Embedding a widget

Publish a widget, then copy its snippet from the editor's **Embed** tab:

```html
<div data-cms-widget="WIDGET_ID"></div>
<script src="https://YOUR_HOST/embed.js" async></script>
```

The loader injects an auto-resizing iframe pointing at `/embed/WIDGET_ID`, so the widget
is fully style-isolated from the host page. The raw JSON is also available at
`GET /api/widgets/WIDGET_ID` (CORS-enabled).

## Data-driven widgets

Add a **Data source** (Data sources page) — a read-only MySQL connection. In a widget's
**Content → Data source** tab, pick a table, map its columns to the widget's fields, and
add filters / ordering / a limit. No SQL is written by hand:

- table and column identifiers are validated against `information_schema` and
  backtick-escaped — never interpolated as free text;
- filter values are bound parameters; stacked statements are disabled;
- a hard `LIMIT` is always applied.

**Recommendation:** give the connection a MySQL user with `GRANT SELECT` only. Passwords
are encrypted at rest with `DATASOURCE_ENC_KEY`.

## Image storage (Combined Storage)

Image fields in the editor (hero slides, news thumbnails) accept a URL **or** an uploaded file.
Uploads are streamed by the CMS server to a running
[Combined Storage](https://github.com/andycqos74/combinedstorage) service, which stores the bytes
across its backends and returns a stable public CDN URL (`/f/<token>`). That URL is saved on the
widget and used directly in embeds.

Enable it in `.env` (leave blank to keep image fields URL-only):

| Variable | Purpose |
| --- | --- |
| `STORAGE_BASE_URL` | Base URL of the Combined Storage service, e.g. `http://localhost:4000` |
| `STORAGE_USERNAME` / `STORAGE_PASSWORD` | Its admin credentials |
| `STORAGE_UPLOAD_PARENT` | Folder id to upload into (`root` = top level) |

The CMS talks to Combined Storage server-to-server (admin session cookie, cached and refreshed on
expiry) — browsers never see those credentials. Ensure the storage service has at least one enabled
backend so uploads have somewhere to land.

## Scripts

- `npm run dev` / `build` / `start`
- `npm run db:push` — sync the Prisma schema to MySQL
- `npm run db:seed` — seed admin user + demo widgets
- `npm run db:studio` — open Prisma Studio

## Adding a widget type

1. Add its settings/item zod schemas and a registry entry in `lib/widgets/registry.ts`.
2. Add a render component in `components/widgets/` and wire it into `WidgetRenderer.tsx`.
3. Add its settings/content forms in `app/(admin)/widgets/[id]/forms-settings.tsx`.

Everything else (API, embed, preview, data binding) is generic.

## Deployment

Deploy as a standard Next.js app (Vercel, or any Node host / container). Set the same
env vars in production and point `DATABASE_URL` at your production MySQL. Run
`npm run db:push` (or `prisma migrate deploy` once you adopt migrations) on release.
