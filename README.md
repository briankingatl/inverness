# Inverness HOA — Website & Admin Panel

A static, serverless-ready website with a **local-only admin panel** for managing
events, points of interest, and images. Content is edited locally, committed to
git, and published via a build step that **excludes the admin panel** from the
deployed output.

## Repository layout

```
├── index.html          Public site (single page)
├── css/styles.css      Site styles
├── js/main.js          Site logic — fetches data/events.json & data/poi.json
│                       (with inline fallbacks if the fetch fails)
├── data/               Content edited by the admin panel:
│   ├── events.json         intro, scrapbook photos, seasonal events
│   └── poi.json            map points of interest
├── images/             Media referenced as images/...
├── static/             Extra static pages
├── scripts/
│   ├── build-site.js       Stages the deployable site into dist/ (no admin/)
│   └── optimize-images.js  Converts jpg/png → webp (optional, needs sharp)
├── package.json        Site build: `npm run build`
└── admin/              LOCAL-ONLY admin panel — tracked in git for versioning,
    │                   but never published. Has its own package.json/server.
    ├── server.js           Express server + admin API
    ├── admin.html          Admin UI (login, Events/POI/Images tabs)
    ├── js/admin.js, css/admin.css
    └── .env                Login credentials (gitignored — never commit)
```

**Rule of thumb:** anything in the repo root (except `admin/`, `scripts/`,
`node_modules/`, `dist/`) is published. Everything under `admin/` stays local.

## Requirements

- **Node 22.9+** (developed on Node 24) — only needed for the admin server and
  the build script. The site itself is pure static HTML/CSS/JS.
- No npm dependencies are required for the site build.

## Local admin panel (the only way to edit content)

```bash
cd admin
npm install          # first time only
npm start            # loads .env natively, no dotenv needed
```

Open **http://localhost:3000/admin.html**

The server refuses to start without credentials. Create `admin/.env` (it is
gitignored):

```
ADMIN_USER=admin
ADMIN_PASS=your-secure-password
```

What the admin panel does:

| Tab | Writes to |
|---|---|
| Events (intro, scrapbook, seasonal) | `../data/events.json` |
| Points of Interest | `../data/poi.json` |
| Images (upload / list / delete) | `../images/` |

Changes are written to disk immediately on save. The server also serves the
public site at **http://localhost:3000/** so you can preview as you go.

**To move admin elsewhere:** copy the whole `admin/` folder (it is fully
self-contained) and run it from there — it writes back to the repo root one
level up, so keep it as a sibling of `data/` and `images/`.

## Publish workflow

1. Edit content via the admin panel.
2. Commit the changed content (and `admin/` too, if you changed admin code):

   ```bash
   git add data images
   git commit -m "content update"
   git push
   ```

3. Your host runs the build and publishes the result.

## Deployment

```bash
npm run build
```

stages the deployable site into **`dist/`** — a byte-exact copy of the site
with `admin/`, `scripts/`, and other local-only files removed. `dist/` is
gitignored (build output). Point your host's publish directory at `dist/`:

| Host | Build command | Publish directory |
|---|---|---|
| Netlify | `npm run build` | `dist` |
| Vercel | `npm run build` | `dist` (Output directory) |
| Cloudflare Pages | `npm run build` | `dist` |
| GitHub Pages | Actions workflow: run `npm run build`, upload `dist/` as the Pages artifact | — |

The admin panel is in git for versioning but can never ship, because the build
step strips it out of `dist/`.

## Image optimization (optional)

`scripts/optimize-images.js` converts jpg/png sources to `.webp` in place using
`sharp`. It is not a dependency of the site — install it once if you use this
script:

```bash
npm i sharp
node scripts/optimize-images.js
```

## Known limitations

- Admin sessions are in-memory and last 1 hour; you must re-login after a
  server restart.
- The admin Images tab lists only files directly in `images/` (non-recursive),
  so existing subfolder galleries won't appear in the picker.
