# Sales Reporter — PWA

An offline-first Progressive Web App for field sales teams: log customer and dealer visits, travel expenses and advances, work through assigned tasks and IndiaMART leads, plan the next day and week, and track performance.

The screens and features follow the Sales Reporter dashboard. The visual design (palette, typography, cards, hero, tab bar, spacing) follows the Meridian PWA. **All data is fictional sample data** that's generated on first launch and stored on the device.

**Live app:** https://canaresonline.com/salesreporter-app/ (Hostinger, deployed automatically from this private repo)

---

## Features

| Screen | What it does |
|---|---|
| **Home** | Live clock and start/end of the field day, today's counts, this week's order-value chart, daily work report (office/field rows), today's value, plans, open tasks, quick actions. In manager view it also shows pending approvals. |
| **Visits** | Visit form: type, customer autocomplete with auto-fill, category, purpose, product, outcome, follow-up date, quotation/order/payment toggles with values, competitor notes, remarks, optional GPS. Recent visits by period, with a detail sheet for editing or deleting. A follow-up automatically creates a plan. |
| **Expenses** | Active advance with a balance ring. Expense form with travel mode, km × rate, public transport, boarding, lodging and other costs, bill attachments, and a live total and remaining balance. Advance requests are capped by the rate-master limits. In manager view you can approve or reject team expenses and advances. |
| **Tasks** | Status filter, counts and overdue tracking. Each task moves Open → In progress → Done. In manager view you can assign tasks and route unassigned IndiaMART leads. |
| **Plans** | Next-day plan, next-week plan and pending work. Add, edit, mark done, undo and delete. |
| **Reports** | Eight KPIs for six periods, trends for orders, quotations and payments, a visit-outcome conversion ring and top customers. In manager view: per-member and whole-team reports. Printable. |
| **Sales data** | Quotations, transfer orders and delivery challans with search and totals. Each opens a line-item sheet that shows GST. |
| **Profile** | Employment details, per-km rates, company name, rate master, a manager-view switch, install button, connection status, JSON backup and a demo-data reset. |

**PWA:** installable on Android, iOS, Windows, macOS and ChromeOS. Works fully offline after the first visit and shows an offline page for anything that wasn't cached. Each deploy shows a "new version" banner. Includes maskable icons, app shortcuts, theme colours and self-hosted fonts (no third-party requests).

**Responsive layout:**
- Phone (under 600 px): bottom tab bar plus a "More" sheet
- Tablet (600–1023 px): icon rail on the left
- Desktop (1024 px and up): full sidebar with two-column content

---

## Project structure

```
sales-reporter-pwa/
├── .github/workflows/deploy.yml   # builds and deploys to GitHub Pages on every push to main
├── public/                        # the site (source of truth)
│   ├── index.html                 # app shell
│   ├── offline.html               # offline fallback page
│   ├── 404.html                   # GitHub Pages: unknown paths → app root
│   ├── manifest.json              # web app manifest (relative URLs)
│   ├── service-worker.js          # precache + runtime caching
│   ├── robots.txt
│   ├── .nojekyll                  # serve files as-is (no Jekyll)
│   └── assets/
│       ├── css/app.css            # design system + responsive layout
│       ├── css/fonts.css          # @font-face for self-hosted fonts
│       ├── fonts/                 # Fraunces, IBM Plex Sans/Mono (woff2, OFL)
│       ├── icons/                 # 192/512, maskable, apple-touch, favicons
│       └── js/
│           ├── app.js             # bootstrap, hash router, nav, banners
│           ├── pwa.js             # SW registration, updates, install prompt
│           ├── store.js           # state + localStorage persistence
│           ├── data.js            # fictional sample data generator
│           ├── metrics.js         # KPI and series calculations
│           ├── charts.js          # bar chart + ring
│           ├── ui.js              # header, chips, badges, toast, sheet
│           ├── util.js            # safe HTML templating, formatting, dates
│           ├── icons.js           # SVG line icons
│           └── views/             # home, visits, expenses, tasks, plans,
│                                  # reports, salesdata, profile
├── scripts/
│   ├── build.mjs                  # public/ → dist/, cache-busting, checks
│   ├── serve.mjs                  # local static server (mimics Pages sub-path)
│   └── generate-icons.py          # regenerates the PNG icons (Pillow)
├── package.json
└── README.md
```

There are no runtime dependencies and no framework. The app is native ES modules, so nothing has to be compiled. The build step only stamps a cache version and checks that the files are consistent.

### Why it works from a GitHub repository sub-path

GitHub Pages serves project sites from `https://<user>.github.io/<repo>/`. The app is built to work from there:

- **Relative URLs everywhere.** All asset, manifest, icon and service-worker URLs start with `./` or a bare path, never `/`.
- **Manifest paths.** `start_url` is `./#/home`, `scope` is `./` and `id` is `./`.
- **Service worker scope.** The worker registers with `./service-worker.js` and scope `./`. It resolves every cached URL against its own scope.
- **Hash routing.** Routes look like `#/visits`, so a page reload never asks the server for a path that doesn't exist.
- **Unknown paths.** `404.html` sends visitors who land on an unknown path back to the app root (`/<repo>/visits` → `/<repo>/#/visits`).

---

## Local development

Requirements: **Node.js 18 or newer** (nothing to `npm install`).

```bash
git clone https://github.com/gajananhs/salesreport.git
cd salesreport

npm run dev        # serves public/ at http://localhost:5173/sales-reporter-pwa/
```

To test the production build, including the stamped service worker:

```bash
npm run preview    # builds to dist/ and serves it at http://localhost:4173/sales-reporter-pwa/
```

Notes:
- `localhost` counts as a secure context, so the service worker, offline mode and install prompt all work locally.
- During development the service worker caches files. After editing, use DevTools → Application → Service workers → **Update on reload**, or hard-reload the page.
- To try offline mode: DevTools → Network → **Offline**, then reload.
- To start over with fresh sample data: Profile → **Reset demo data**.

### Build

```bash
npm run build
```

The build:
1. Copies `public/` to `dist/`.
2. Writes a content hash into `BUILD_ID` in `service-worker.js` and into `APP_VERSION` in `pwa.js`. Every deploy gets a new cache, and old caches are deleted.
3. **Fails** if any shipped file is missing from the service worker's `PRECACHE` list, if a listed file is missing, or if the manifest uses an absolute path.

When you add a file under `public/`, add it to `PRECACHE` in `public/service-worker.js`. The build tells you if you forget.

### Regenerate icons (optional)

```bash
pip install pillow
npm run icons
```

---

## Deploy — which option?

| Repo visibility | Hosting | Workflow | Cost |
|---|---|---|---|
| **Private** | Hostinger (your existing site) | `.github/workflows/deploy-hostinger.yml` | Free (uses your existing hosting) |
| Public | GitHub Pages | `.github/workflows/deploy.yml` | Free |
| Private | GitHub Pages | `deploy.yml` (remove its `if:` line) | GitHub Pro or Team plan |

Both workflows run on every push to `main`. The GitHub Pages workflow skips itself automatically when the repo is private.

> A private repo keeps the **source code** private. The deployed app is a public web address either way, which is normal for a PWA. GitHub Pages can only restrict *who can open the site* on GitHub Enterprise.

## Deploy to Hostinger automatically (private repo)

This option needs no GitHub upgrade. Every push builds the app and uploads only the changed files over FTPS.

1. **Create an FTP account** in Hostinger hPanel: **Files → FTP Accounts**. Give it a folder such as `public_html/salesreporter-app`. Note the **FTP hostname**, **username** and **password**.
2. **Add four secrets** in the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**:

   | Name | Example |
   |---|---|
   | `FTP_SERVER` | `ftp.canaresonline.com` |
   | `FTP_USERNAME` | `u123456789.salesapp` |
   | `FTP_PASSWORD` | the FTP password |
   | `FTP_SERVER_DIR` | `./` if the FTP account is already locked to the app folder; otherwise `public_html/salesreporter-app/` (must end with `/`) |

3. **Run it.** Open **Actions → Deploy to Hostinger (FTP) → Run workflow**, or simply push to `main`.
4. **Open the site** at `https://canaresonline.com/salesreporter-app/`. HTTPS must be enabled on the domain; Hostinger's free SSL is enough.

The included `public/.htaccess` forces HTTPS, sets the cache headers the service worker needs, and enables compression.

Other free hosts that also auto-deploy from private repos (connect the repo once in their dashboard, then set build command `npm run build` and output folder `dist`): **Cloudflare Pages**, **Netlify**, **Vercel**.

## Deploy to GitHub Pages (public repo)

The repository already includes the workflow at `.github/workflows/deploy.yml`.

### Using a new repository

1. Create an empty repository on GitHub, for example `sales-reporter-pwa`.
2. Push the code:
   ```bash
   cd sales-reporter-pwa
   git init
   git add .
   git commit -m "Sales Reporter PWA"
   git branch -M main
   git remote add origin https://github.com/<your-user>/sales-reporter-pwa.git
   git push -u origin main
   ```
3. On GitHub, open **Settings → Pages**. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Open the **Actions** tab. The *Deploy to GitHub Pages* run starts on every push to `main`; you can also start it from the tab with **Run workflow**. It takes about a minute.
5. Open `https://<your-user>.github.io/sales-reporter-pwa/`.

The repository name can be anything because all paths are relative. A custom domain (Settings → Pages → Custom domain) also works without code changes.

### Updating

Push to `main`. The workflow rebuilds and redeploys. Open apps detect the new service worker and show **"A new version is ready — Reload."**

---

## Installing the app

- **Android (Chrome):** use the in-app **Install** banner, or ⋮ menu → *Install app*.
- **iPhone / iPad (Safari):** tap Share → *Add to Home Screen*.
- **Desktop (Chrome / Edge):** click the install icon in the address bar, or use Profile → **Install**.

After installation the app opens full-screen, works offline, and has shortcuts for *Log visit*, *Log expense* and *Reports* (long-press the icon on Android, right-click on desktop).

---

## Data and privacy

- All records stay in the browser's `localStorage` on the device. Nothing is sent to any server.
- Bill attachments: only the file names are recorded in this demo.
- GPS is requested only when you tap **Capture** on the Visits screen. It is captured automatically only if you granted permission earlier.
- Profile → **Download backup (JSON)** exports everything.

To connect a real backend later, replace the reads and writes in `assets/js/store.js` with API calls. The views only use `store.get()`, `store.update()` and `store.subscribe()`.

---

## Browser support

The latest two versions of Chrome, Edge, Firefox and Safari (macOS and iOS 15.4+), and Samsung Internet. The app uses ES modules, CSS grid, `:focus-visible` and `dvh` units, with fallbacks where needed.

## Licence

The code is MIT. The fonts (Fraunces, IBM Plex) are under the SIL Open Font License; see `public/assets/fonts/OFL-*.txt`.
