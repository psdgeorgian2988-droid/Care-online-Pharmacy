# MediHome

Customer website plus API for medicines, lab tests, Home Care, psychologist consultation, step-down care, and ambulance in Delhi NCR.

Save this project on your laptop in a folder named **medihome**.

## Run on the laptop

```bash
cd medihome
npm ci
npm test
npm run build
npm start
```

Then open http://localhost:3001/

On a public server (Render, Railway, a VPS, or Docker), set `PORT` if the host assigns one, then use the same `npm run build` and `npm start` commands. Docker:

```bash
docker build -t medihome .
docker run --rm -p 3001:3001 medihome
```

`npm start` serves the built website and the API from one Node process. That is the same command to use when you put the site online.

## Before going live

1. Copy `.env.example` to `.env`.
2. Set Razorpay keys if you want live online pay. Without keys, checkout uses local test pay.
3. Change the staff password. Default staff login is `admin` / `MediHome@26` unless you set `MEDIHOME_ADMIN_USER` and `MEDIHOME_ADMIN_PASSWORD`.
4. Host the app, then attach **medihome.co.in**.

### GoDaddy Node.js Hosting (same account as the domain)

The domain is already at GoDaddy. This app is set up for [GoDaddy Node.js Hosting](https://www.godaddy.com/hosting/nodejs): `npm run build` then `npm start`, `PORT` from the host, Vite in `dependencies` so production install can build.

`medihome.co.in` still answers Cloudflare **1001** while Website Builder owns the A record (`160.153.0.189`). The cutover script publishes the Node app, attaches the domain, and points DNS at the Node anycast IP.

**From GitHub Actions (this agent can finish once the secret exists):**

1. Create a [GoDaddy personal access token](https://developer.godaddy.com/personal-access-token) with: `hosting.application:read`, `hosting.application:create`, `hosting.source:write`, `hosting.source:read`, `hosting.deployment:execute`, `hosting.subscription:read`, `hosting.subscription:write`, `hosting.domain:read`, `hosting.domain:write`, `domains.domain:read`, `domains.dns:update`.
2. Add it as repository secret **`GDDY_PAT`**.
3. Run Actions → **Publish to GoDaddy** (defaults publish `medihome.co.in`).
4. If the live check still returns 1001, turn off Website Builder for the domain and run the workflow again.

**Or from the laptop:**

```bash
export GDDY_PAT=gd_pat_...
bash scripts/godaddy-publish.sh
```

**Or by hand in the dashboard:** open [godaddy.com/hosting/nodejs](https://www.godaddy.com/hosting/nodejs), connect `psdgeorgian2988-droid/Care-online-Pharmacy` branch `main`, Preview, Publish, attach **medihome.co.in**, turn off Website Builder.

A free preview is private (GoDaddy login). Publishing on the domain needs a GoDaddy Web Hosting plan if you do not already have one.

### Render (optional)

[Deploy to Render](https://render.com/deploy?repo=https://github.com/psdgeorgian2988-droid/Care-online-Pharmacy) using `render.yaml`, then add custom domain `medihome.co.in` in Render. That still needs an A/CNAME change in GoDaddy DNS and Website Builder turned off.

## Partner login

Staff create each partner’s first **Login ID** and **password** on the Staff Desk. Partners sign in at `#partner` with those details. Demo mobiles and PINs are not shown on the website.

## Scripts

- `npm run dev` — Vite customer site on port 5173 (API via the Vite plugin)
- `npm test` — unit tests
- `npm run build` — production website into `dist/`
- `npm start` — website + API together
- `npm run app:sync` — build the website and copy it into the Android / iOS projects

## Phone apps (Customer, Staff, Partner)

One React codebase powers the website and the Android / iPhone apps (Capacitor). The app UI is bundled from `dist/`. API calls go to `https://medihome.co.in` (or your laptop during live reload).

On the website, open the separate desks from the footer:

- **Customer** (`/#customer`) — customer webpage, then home / login / register
- **Partner** (`/#partner`) — partner jobs desk
- **Staff** (`/#staff`) — staff webpage, then operations desk (`/#admin`)

Installed apps with no saved role open a chooser linking to those three pages.
### Build and open Android / iOS

```bash
npm ci
npm run app:sync
npm run app:android   # Android Studio
npm run app:ios       # Xcode (Mac only)
```

`app:sync` builds the website, writes `capacitor.config.json`, and copies `dist/` into `android/` and `ios/`.

### Live reload from your laptop (optional)

Terminal 1 — website + API:

```bash
npm run dev
npm run server
```

Terminal 2 — point the app shell at your laptop, then sync:

```bash
# Android emulator → laptop
MEDIHOME_APP_SERVER=http://10.0.2.2:5173 npm run app:sync:live
npm run app:android

# Physical phone on the same Wi‑Fi → use your laptop IP, e.g.:
# MEDIHOME_APP_SERVER=http://192.168.1.7:5173 npm run app:sync:live
```

Remove `MEDIHOME_APP_SERVER` and run `npm run app:sync` again before a Play Store / App Store build so the app uses the bundled UI.
