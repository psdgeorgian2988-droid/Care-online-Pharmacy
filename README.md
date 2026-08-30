# MediHome

Customer website plus API for medicines, lab tests, Home Care, psychologist consultation, step-down care, and ambulance in Delhi NCR.

Save this project on your laptop in a folder named **medihome**.

## Run on the laptop

```bash
cd medihome
npm ci
npm test
npm start
```

Then open http://localhost:3001/

On a public server (Render, Railway, a VPS, or Docker), set `PORT` if the host assigns one. GoDaddy should use `npm start`. Docker builds during the image build and skips a second compile at boot.

```bash
docker build -t medihome .
docker run --rm -p 3001:3001 medihome
```

`npm start` builds the website from the latest source, then serves it with the API. That is the command GoDaddy should run after a GitHub pull, so an old `dist/` folder is not left on the domain.

## Before going live

1. Copy `.env.example` to `.env`.
2. Set Razorpay keys if you want live online pay. Without keys, checkout uses local test pay.
3. Change the staff password. Default staff login is `admin` / `MediHome@26` unless you set `MEDIHOME_ADMIN_USER` and `MEDIHOME_ADMIN_PASSWORD`.
4. Host the app, then attach **medihome.co.in**.

### GoDaddy Node.js Hosting (same account as the domain)

The domain is already at GoDaddy. This app is set up for [GoDaddy Node.js Hosting](https://www.godaddy.com/hosting/nodejs): start command `npm start` (this rebuilds the site from source), `PORT` from the host, Vite in `dependencies` so production install can build. After every GitHub pull, click **Publish Now** (or restart) so `medihome.co.in` is rebuilt. Check `https://medihome.co.in/api/version` — it should say `"release":"partner-login-id"`.

1. Merge this repo’s latest `main` (or connect the branch that has these hosting fixes).
2. Open [godaddy.com/hosting/nodejs](https://www.godaddy.com/hosting/nodejs) while logged into the account that owns **medihome.co.in**.
3. Start for Free → connect GitHub repo `psdgeorgian2988-droid/Care-online-Pharmacy` (or upload a zip with no `node_modules`).
4. Wait for the private preview, then **Publish** and connect **medihome.co.in**. GoDaddy sets DNS and HTTPS when the domain is on that account.
5. Turn off Website Builder / forwarding for this domain so the builder page is not still answering.

A free preview is private (GoDaddy login). Publishing on the domain needs a GoDaddy Web Hosting plan if you do not already have one.

### Render (optional)

[Deploy to Render](https://render.com/deploy?repo=https://github.com/psdgeorgian2988-droid/Care-online-Pharmacy) using `render.yaml`, then add custom domain `medihome.co.in` in Render. That still needs an A/CNAME change in GoDaddy DNS and Website Builder turned off.

## Partner login

Staff create each partner’s first **Login ID** and **password** on the Staff Desk. Partners sign in at `#partner` with those details. Demo mobiles and PINs are not shown on the website.

## Scripts

- `npm run dev` — Vite customer site on port 5173 (API via the Vite plugin)
- `npm test` — unit tests
- `npm run build` — production website into `dist/`
- `npm start` — rebuild website from source, then serve website + API
- `npm run app:sync` — build the website and copy it into the Android / iOS projects

## Phone apps (Customer, Staff, Partner)

The website is the working app. Open **Apps** in the sidebar (or `/#apps`) and pick:

- **Customer App** — home, medicines, bookings, account
- **Staff App** — operations desk
- **Partner App** — assigned jobs

Install from the phone browser with Add To Home Screen, or wrap the same site with Capacitor:

```bash
npm run build
npx cap sync
# Android emulator talking to this laptop:
MEDIHOME_APP_SERVER=http://10.0.2.2:3001 npx cap sync
npx cap open android
```

The packaged app loads `https://medihome.co.in` unless you set `MEDIHOME_APP_SERVER`.
