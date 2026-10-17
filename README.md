# Sales Reporter — PWA (blue Meridian theme, live server)

An installable Progressive Web App for the **Sales Reporter** system.

**Live app:** https://gajananhs.github.io/salesreport/

- **Full original app.** The original Sales Reporter screens and logic (`assets/js/app.js`) run unchanged. That includes visits, daily work reports, expenses, advance requests and approvals, payments, tasks, IndiaMART leads, lead routing, plans, reports, sales data, the admin panel, TallyField, Tally ledger import/export, Logbook SSO, and password reset.
- **Live data.** Login, data, approvals, e-mails, IndiaMART sync and Tally sync all stay on the existing server, `https://canaresonline.com/Salesreport/`. No data is copied into this repo. The repo is public, so it contains no personal data and no secrets.
- **New look.** A blue Meridian theme (navy, amber, Fraunces and IBM Plex) is layered over the original stylesheet. Phones get a bottom tab bar, tablets an icon rail, desktops a full sidebar.
- **PWA.** Installable on Android, iOS and desktop. The app shell is cached, so it opens instantly, shows an offline notice when there's no connection, and shows a "new version" banner after each deploy.

```
 Phone / PC  ──►  gajananhs.github.io/salesreport/   (this repo: app shell, GitHub Pages)
                         │  fetch + X-Session-Token
                         ▼
                 canaresonline.com/Salesreport/api/   (existing PHP + MySQL, unchanged)
```

---

## One-time server step (required)

The browser only lets the GitHub-hosted app read the API's replies if the API allows that origin. This takes **one new file** on the server. It adds response headers only; no PHP, data or logic changes.

1. In this repo, download `server/api-cors.htaccess`.
2. In hPanel → **File Manager**, open `public_html/Salesreport/api/`.
   - **If there's no `.htaccess` in that folder:** upload the file and rename it to **`.htaccess`**.
   - **If a `.htaccess` already exists:** open it and paste the contents of `api-cors.htaccess` at the end. Don't replace what's already there.
3. Open https://gajananhs.github.io/salesreport/ and log in with your usual Sales Reporter account.

What the file does:
- It allows `https://gajananhs.github.io` (and `localhost:5173/4173` for local testing).
- It answers the browser's OPTIONS pre-flight with 204.
- It leaves the TallyField endpoints (`tf_*.php`) alone, because they already send their own CORS headers.

Users still need their normal login token. CORS on its own grants no access.

The existing site at `canaresonline.com/Salesreport/` keeps working exactly as before, and both can be used side by side.

---

## Project structure

```
salesreport/
├── .github/workflows/
│   ├── deploy.yml              # GitHub Pages deploy on every push to main
│   └── deploy-hostinger.yml    # optional FTP deploy (manual)
├── public/                     # the site
│   ├── index.html              # original index.php markup (PHP removed) + PWA head
│   ├── lead_routing.html       # original Lead Routing report, pointed at the server
│   ├── offline.html  404.html  manifest.json  service-worker.js  robots.txt  .nojekyll  .htaccess
│   └── assets/
│       ├── css/style.css               # ORIGINAL stylesheet (unchanged)
│       ├── css/theme.css               # blue Meridian theme + responsive navigation
│       ├── css/lead-routing-theme.css  # theme for the lead routing page
│       ├── css/fonts.css  fonts/       # self-hosted Fraunces / IBM Plex
│       ├── icons/                      # PWA icons (blue)
│       └── js/
│           ├── config.js       # SERVER address of the backend
│           ├── app.js          # ORIGINAL app logic (only the server address is patched)
│           └── pwa.js          # icons, sidebar brand, install/update/offline banners, service worker
├── server/api-cors.htaccess    # upload to Salesreport/api/.htaccess (see above)
├── scripts/                    # build, local server, icon generator
├── package.json
└── README.md
```

### Changes to the original code

- `app.js`:
  - The API address comes from `config.js`.
  - Bill and ticket links (`uploads/...`) are turned into full server URLs with `srvUrl()`.
  - Nothing else in the file was changed.
- `index.html`: the original `index.php` markup, word for word, minus the PHP cache-busting tags. The PWA meta tags, `theme.css`, `config.js` and `pwa.js` are added.
- `lead_routing.html`: the API address comes from `config.js`, and the "back" links point to `./`.

### Changing the server address

Edit `public/assets/js/config.js` and set `SERVER` to the new address, ending in `/`. Then commit; the app redeploys automatically. You can also point a single browser at another backend for testing: `localStorage.setItem('sr_server', 'https://…/Salesreport/')`.

---

## Local development

Requires Node.js 18 or newer.

```bash
git clone https://github.com/gajananhs/salesreport.git
cd salesreport
npm run dev       # http://localhost:5173/sales-reporter-pwa/  (talks to the live server)
npm run preview   # production build served at http://localhost:4173/sales-reporter-pwa/
npm run build     # builds dist/; fails if the service-worker precache list is out of date
```

When you add a file under `public/`, also add it to `PRECACHE` in `public/service-worker.js`. The build tells you if you forget.

## Deploy

Every push to `main` builds the app and publishes it to GitHub Pages in about 30 seconds (see `.github/workflows/deploy.yml`). Installed apps then show **"A new version is ready — Reload"**.

First-time setup, already done for this repo:
1. Make the repo **public**.
2. Set **Settings → Pages → Source** to **GitHub Actions**.

## Install the app

- **Android / desktop Chrome or Edge:** use the **Install** banner, or the install icon in the address bar.
- **iPhone / iPad:** open the link in Safari, tap **Share**, then **Add to Home Screen**.

## How it was tested

The original PHP backend was run locally (Apache + PHP 8.3 + MariaDB) with `server/api-cors.htaccess` in place, and the PWA was served from a different origin, the same way GitHub Pages serves it. Tested:
- logging in as an executive and as the GM
- saving a visit and a plan
- the home totals updating
- every tab at phone, tablet and desktop sizes
- the admin panel (rate master, approvals, TallyField, team, lead rules)
- the Lead Routing page
- the service worker

## Licence

The code is MIT. The fonts are under the SIL Open Font License (`public/assets/fonts/OFL-*.txt`).
