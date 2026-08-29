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
4. Point **medihome.in** (or your host) at this server and put HTTPS in front of port 3001.

## Demo logins

- Staff: `admin` / `MediHome@26`
- Partner mobiles: `9654222901`–`9654222907`, PIN `1111`
- Care WhatsApp: `7292094000`

## Scripts

- `npm run dev` — Vite customer site on port 5173 (API via the Vite plugin)
- `npm test` — unit tests
- `npm run build` — production website into `dist/`
- `npm start` — website + API together
