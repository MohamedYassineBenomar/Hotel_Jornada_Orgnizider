# Jornada

Auto-build a rule-compliant weekly shift schedule for a hotel-restaurant in Barcelona.
Next.js (App Router) + Prisma + Neon Postgres + Resend, deployed on Vercel.

## Local setup

1. **Prerequisites.** Node 20+ and a Neon project (or any reachable Postgres instance) plus a Resend account.

2. **Clone and install.**
   ```bash
   git clone <repo-url>
   cd Workers_Jornada_Orgnizer
   npm install
   ```
   The repo ships an `.npmrc` with `legacy-peer-deps=true` because the pinned Next 15 / React 19 combination uses an RC peer range. This is intentional.

3. **Environment.** Copy `.env.example` to `.env.local` and fill the values. Required:
   - `DATABASE_URL` — Neon **pooled** connection string.
   - `DIRECT_URL` — Neon direct (non-pooled) connection string. Used by Prisma migrations.
   - `RESEND_API_KEY` — from Resend dashboard.
   - `RESEND_FROM_EMAIL` — verified sender. `onboarding@resend.dev` works while testing.
   - `SESSION_SECRET` — 32+ random characters. Generate with `openssl rand -base64 32`.
   - `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` locally, the Vercel URL in production.

4. **Database schema.** Once `DATABASE_URL` and `DIRECT_URL` point at a real Postgres:
   ```bash
   npx prisma migrate dev --name init
   npm run seed
   ```
   `npm run seed` creates one Restaurant + a `demo@jornada.local` manager + 8 sample workers, all idempotent.

5. **Run the dev server.**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## Auth (magic link)

There are no passwords. On `/entrar` the manager submits an email and receives a one-time link via Resend (valid 15 minutes). Clicking it sets a sealed `iron-session` cookie and redirects to `/panel`.

For local testing without a real Resend send, look in the dev server logs — the magic-link URL is still generated and the email is rendered, but Resend may reject it without a verified sender. Pasting the URL printed in the server-side `[auth/request]` log into the browser is the fastest path.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server (Turbo off by default for stable hot-reload of server modules). |
| `npm run build` | Runs `prisma generate` then `next build`. |
| `npm run start` | Boots the production build. |
| `npm run prisma:migrate` | `prisma migrate dev` (creates a new migration in `prisma/migrations`). |
| `npm run prisma:studio` | Opens Prisma Studio for inspecting the DB. |
| `npm run seed` | Runs `prisma/seed.ts`. Safe to re-run. |

## Project layout (high level)

```
app/
  (marketing)/   Landing page (one route)
  (auth)/        /entrar, /entrar/revisa, /verificar
  (app)/         Authed shell: /panel, /trabajadores, /horario, /horas, /ajustes
  api/           22 route handlers covering auth, workers, vacations,
                 schedule (weeks, shifts, autofill, publish), summary, settings
components/
  ui/            shadcn primitives (Button, Dialog, Form, ...)
  app-shell/     Sidebar, top nav, locale provider
  schedule/      WeekGrid + supporting controls (the hero feature)
  workers/, summary/, settings/
lib/
  scheduler/     Pure-TS constraint-propagation solver (the magic moment)
  time/          Madrid-tz / ISO-week / minutes helpers
  i18n/, auth/, email/, validation/, api/
prisma/
  schema.prisma  Source of truth for the DB shape
  seed.ts        Idempotent dev seed
messages/
  es-ES.json     Single locale at launch (EN slot reserved)
```

## Magic moment

On the schedule page click **Auto-llenar semana**. The solver runs server-side, places shifts respecting every hard constraint from the spec (coverage on planta_0 + kitchen, terrace coverage in season, max hours per worker, days-off, vacation, no double-booking, role/zone validity), and emits any leftover gaps as red `UncoveredSlot` blocks with a Spanish reason. Partial > empty: the solver never refuses.

## Notes

- Times are stored as **minutes since midnight** alongside a `Date`. All UI formatting goes through `lib/time/madrid.ts` so DST and timezones cannot drift.
- API routes use the Node runtime (`runtime = 'nodejs'`) because Prisma is not edge-compatible.
- The middleware checks only the **presence** of the session cookie on `(app)/*` paths; the unseal happens inside Node handlers.
- Every visible string flows through `t(key)` and is mirrored in `messages/es-ES.json`. Role names stay in Spanish across locales.

Launch will add the deploy URLs and Vercel-specific notes after the first deploy.
