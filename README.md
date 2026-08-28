# Kopi Boy Partner

One app for both cooks and riders (per the locked spec — one partner
login, role determines the dashboard). Next.js 16 + TypeScript + Tailwind
v4, same design tokens as Kopi Boy Customer and Kopi Boy HQ.

## Getting started
```bash
npm install
npm run dev   # http://localhost:3000
npm run build
```

## Current status: Feature #001-equivalent — Foundation + shell

- Design system shared with Customer/HQ (`src/app/globals.css`)
- Cook view: order list with PENDING/ACCEPTED/PREPARING/READY/COMPLETED
  states, Accept/Reject action on pending orders (not yet wired to a
  backend)
- Rider view: delivery list with pickup/dropoff/fee
- View toggle is a **demo stand-in** for real role-based routing — real
  auth + role assignment is Feature #002

Demo data only — `src/lib/demo-data.ts`. No backend, no PayNow flow yet
(that's Feature #006), no real rider dispatch (Feature #008).
