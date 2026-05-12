# Jornada — Architecture

Solutions Architect: Blueprint. Inputs: `spec.md`. Stack defaults confirmed by user (Next.js + Vercel + Neon + Prisma + Resend + Tailwind + shadcn).

---

## 1. Stack

### Runtime dependencies

| Dependency | Version | Justification |
|---|---|---|
| `next` | `15.0.3` | App Router + Route Handlers + Server Actions; required by spec. |
| `react` / `react-dom` | `19.0.0` | Locked to Next 15's bundled major. |
| `typescript` | `5.6.3` | Strict mode across `app/` and `lib/scheduler`; non-negotiable. |
| `@prisma/client` | `5.22.0` | Type-safe DB client; matches Prisma CLI. |
| `prisma` | `5.22.0` | Schema + migrations against Neon (direct URL). |
| `pg` | `8.13.1` | Required transitively by Prisma in some serverless paths; pin for reproducibility. |
| `resend` | `4.0.1` | Magic-link email delivery; official SDK, tiny. |
| `iron-session` | `8.0.4` | Sealed signed-cookie sessions; no external session store needed. Beats hand-rolling JWT and beats NextAuth's footprint for one-role passwordless. |
| `zod` | `3.23.8` | Single source of truth for API input validation + form schemas. |
| `react-hook-form` | `7.53.2` | Lean form state; pairs with Zod via resolver. |
| `@hookform/resolvers` | `3.9.1` | Zod resolver glue. |
| `tailwindcss` | `3.4.14` | Styling baseline (shadcn/ui requirement). |
| `tailwind-merge` | `2.5.4` | Required by shadcn `cn` util. |
| `clsx` | `2.1.1` | Required by shadcn `cn` util. |
| `class-variance-authority` | `0.7.1` | Required by shadcn primitives. |
| `tailwindcss-animate` | `1.0.7` | shadcn animation utilities. |
| `lucide-react` | `0.460.0` | Icon set used by shadcn defaults. |
| `@radix-ui/react-dialog` | `1.1.2` | Backs shadcn `Dialog` (confirm-overwrite on Auto-fill). |
| `@radix-ui/react-dropdown-menu` | `2.1.2` | Backs shadcn `DropdownMenu` (week nav, worker row actions). |
| `@radix-ui/react-label` | `2.1.0` | Backs shadcn `Label`. |
| `@radix-ui/react-popover` | `1.1.2` | Backs shadcn `Popover` (date pickers, zone filter). |
| `@radix-ui/react-select` | `2.1.2` | Backs shadcn `Select` (role/zone pickers in shift editor). |
| `@radix-ui/react-toast` | `1.2.2` | Backs shadcn `Toast` (save/publish feedback). |
| `@radix-ui/react-tooltip` | `1.1.4` | Backs shadcn `Tooltip` (violation reasons on grid blocks). |
| `@radix-ui/react-slot` | `1.1.0` | Backs shadcn `Button` polymorphism. |
| `date-fns` | `4.1.0` | ISO week math, Europe/Madrid arithmetic; no moment, no luxon. |
| `date-fns-tz` | `3.2.0` | Timezone-aware formatting for `Europe/Madrid` (DST safe). |
| `nanoid` | `5.0.9` | Cryptographic random for magic-link tokens (hashed before storage). |

### Dev dependencies

| Dependency | Version | Justification |
|---|---|---|
| `@types/node` | `22.9.0` | Node 20 LTS types on Vercel. |
| `@types/react` | `19.0.1` | Matches React 19. |
| `@types/react-dom` | `19.0.1` | Matches React 19. |
| `eslint` | `9.14.0` | Next ships with it; keep linting on. |
| `eslint-config-next` | `15.0.3` | Sensible Next defaults; no extra plugins. |
| `prettier` | `3.3.3` | Format consistency; no plugin sprawl. |
| `tsx` | `4.19.2` | Run TS scripts (seed, scheduler benchmark) without a build. |
| `postcss` | `8.4.49` | Tailwind requirement. |
| `autoprefixer` | `10.4.20` | Tailwind requirement. |

### Auto-fill solver — choice and reasoning

**Choice:** **Pure-TypeScript constraint-propagation solver in `lib/scheduler/`** — no MILP library, no native deps.

**Why:**
- Launch scale is tiny: ≤20 workers × 7 days × 36 half-hour slots × ~4 roles. The search space is well within reach of greedy assignment with backtracking + minute-by-minute coverage propagation.
- Hard constraints in spec §4 Auto-fill are local (per worker, per zone, per minute) and decompose cleanly into propagation rules — no global linear objective worth modeling in MILP terms.
- Soft preferences are an ordered priority list (templates → handoffs → even distribution → respect pinned), trivially encoded as scoring tiebreakers, not as an LP objective.
- An MILP lib (`javascript-lp-solver`, `glpk.js`, `highs-js`) would add WASM weight, opaque infeasibility messages, and a translation layer between business rules and matrix form. Bad trade for ≤10s p95 at this scale.
- A pure-TS implementation runs natively on Vercel serverless (no native binaries), is debuggable line-by-line, and emits `UncoveredSlot` rows with human-readable Spanish reasons directly from the propagation step — which is exactly what spec §4 demands on infeasibility.

If launch scale grows past ~50 workers and ≥3 zones we revisit with a heuristic search (simulated annealing) before reaching for MILP. Not a v1 concern.

---

## 2. File tree

```
.
├── app/
│   ├── (marketing)/
│   │   └── page.tsx                       # Landing page → CTA Entrar
│   ├── (auth)/
│   │   ├── entrar/
│   │   │   ├── page.tsx                   # Email input form (request magic link)
│   │   │   └── revisa/page.tsx            # "Revisa tu correo" confirmation page
│   │   └── verificar/route.ts             # GET handler that consumes ?token=... and sets session
│   ├── (app)/
│   │   ├── layout.tsx                     # Authed shell: sidebar, top nav, locale provider
│   │   ├── panel/page.tsx                 # Dashboard: week summary + CTA Ver horario
│   │   ├── trabajadores/
│   │   │   ├── page.tsx                   # Workers list
│   │   │   └── [id]/page.tsx              # Edit worker + vacation blocks
│   │   ├── horario/
│   │   │   ├── page.tsx                   # Week grid (defaults to current ISO week)
│   │   │   └── [isoYearWeek]/page.tsx     # /horario/2026-W19 deep link
│   │   ├── horas/page.tsx                 # Hours & vacation summary table
│   │   └── ajustes/page.tsx               # Restaurant settings (terrace season, hours)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── request/route.ts           # POST { email } → send magic link
│   │   │   ├── verify/route.ts            # GET ?token=... → set session, redirect /panel
│   │   │   └── logout/route.ts            # POST → clear session
│   │   ├── workers/
│   │   │   ├── route.ts                   # GET list, POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts               # GET, PATCH, DELETE (soft-archive)
│   │   │       └── vacations/
│   │   │           ├── route.ts           # GET, POST
│   │   │           └── [vacationId]/route.ts  # DELETE
│   │   ├── schedule/
│   │   │   ├── weeks/
│   │   │   │   ├── route.ts               # GET (by ?isoYear=&isoWeek=) or list
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts           # GET week + shifts + uncovered
│   │   │   │       ├── publish/route.ts   # POST → flip draft→published (validates)
│   │   │   │       └── autofill/route.ts  # POST → run solver, return draft
│   │   │   └── shifts/
│   │   │       ├── route.ts               # POST create
│   │   │       └── [id]/route.ts          # PATCH, DELETE
│   │   ├── summary/route.ts               # GET hours+vacation summary (?isoYear=&isoWeek=)
│   │   └── settings/route.ts              # GET, PATCH restaurant settings
│   ├── layout.tsx                         # Root layout: <html lang="es">, fonts, providers
│   ├── globals.css                        # Tailwind + shadcn css vars
│   ├── not-found.tsx
│   └── error.tsx
├── components/
│   ├── ui/                                # shadcn primitives (button, input, dialog, etc.)
│   ├── app-shell/
│   │   ├── sidebar.tsx
│   │   ├── top-nav.tsx
│   │   └── locale-provider.tsx            # Wraps children with dictionary context
│   ├── workers/
│   │   ├── worker-form.tsx
│   │   ├── workers-table.tsx
│   │   └── vacation-block-form.tsx
│   ├── schedule/
│   │   ├── week-grid.tsx                  # The hero component: 7d × 36 half-hours grid
│   │   ├── shift-block.tsx                # Single shift render w/ role color + violation badge
│   │   ├── uncovered-block.tsx            # Red block for unfilled minutes
│   │   ├── shift-editor-dialog.tsx        # Create/edit a single shift
│   │   ├── zone-filter.tsx
│   │   ├── week-nav.tsx                   # Prev / Today / Next
│   │   ├── autofill-button.tsx            # CTA + confirm-overwrite dialog
│   │   └── publish-button.tsx             # Disabled while hard violations exist
│   ├── summary/
│   │   └── hours-table.tsx
│   └── settings/
│       └── terrace-season-form.tsx
├── lib/
│   ├── db.ts                              # Prisma client singleton (serverless-safe)
│   ├── auth/
│   │   ├── session.ts                     # iron-session config, getSession()
│   │   ├── token.ts                       # generateToken + hash + verify
│   │   └── middleware-helpers.ts          # requireSession() guard for route handlers
│   ├── email/
│   │   ├── resend.ts                      # Resend client
│   │   └── magic-link.tsx                 # React email template for magic link (es-ES)
│   ├── i18n/
│   │   ├── config.ts                      # Supported locales, default = "es-ES"
│   │   ├── dictionary.ts                  # loadDictionary(locale): cached dynamic import
│   │   └── t.ts                           # t(key, vars) helper bound to current locale
│   ├── time/
│   │   ├── iso-week.ts                    # ISO week math (year, week, start, end)
│   │   ├── madrid.ts                      # Europe/Madrid formatters + DST-safe arithmetic
│   │   └── minutes.ts                     # Time-of-day ↔ minutes-since-midnight helpers
│   ├── scheduler/
│   │   ├── index.ts                       # Public entry: autofill(weekId) → { shifts, uncovered }
│   │   ├── types.ts                       # CandidateAssignment, CoverageRequirement, Slot, etc.
│   │   ├── inputs.ts                      # Load workers, vacations, pinned shifts, settings for a week
│   │   ├── coverage.ts                    # Build per-minute coverage requirements (floor/kitchen/terrace)
│   │   ├── templates.ts                   # Standard shift template generators (06-15, 15-23, etc.)
│   │   ├── candidates.ts                  # Generate candidate (worker, day, segment, role, zone) tuples
│   │   ├── propagate.ts                   # Greedy assignment + constraint propagation + backtrack
│   │   ├── score.ts                       # Soft-preference scoring (templates, even distribution)
│   │   ├── uncovered.ts                   # Emit UncoveredSlot rows + Spanish reasons
│   │   └── validate.ts                    # Shared validator used by inline UI + publish endpoint
│   ├── validation/
│   │   ├── workers.ts                     # Zod schemas
│   │   ├── shifts.ts
│   │   ├── vacations.ts
│   │   └── settings.ts
│   ├── api/
│   │   ├── handler.ts                     # Wraps route handlers with auth + zod + error mapping
│   │   └── errors.ts                      # AppError types, JSON error envelope
│   └── constants.ts                       # Role/zone enum mirrors, default settings, color tokens
├── messages/
│   └── es-ES.json                         # Single locale dictionary at launch (EN slot reserved)
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                            # Creates one Restaurant + a manager User in dev
│   └── migrations/                        # Generated by prisma migrate
├── public/
│   ├── favicon.ico
│   └── og.png                             # Open Graph image for marketing page
├── tests/
│   └── scheduler/
│       ├── coverage.test.ts               # tsx-runnable assertions on solver hard constraints
│       └── fixtures.ts                    # Sample weeks (feasible / infeasible / partial)
├── middleware.ts                          # Edge: redirect unauthed users from (app)/* → /entrar
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── components.json                        # shadcn config
├── .env.example                           # Mirrors §6 env vars
├── .env.local                             # gitignored
├── package.json
└── README.md
```

Forge creates every file listed. Test layer is intentionally minimal: solver-only, run by `tsx`, no Jest/Vitest install in v1.

---

## 3. Data model — `prisma/schema.prisma`

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = []
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum UserRole {
  manager
}

enum WorkerRole {
  camarero
  ayudante_camarero
  cocinero
  ayudante_cocinero
}

enum Zone {
  planta_0
  terraza
}

enum ScheduleStatus {
  draft
  published
}

model Restaurant {
  id                    String   @id @default(cuid())
  name                  String
  timezone              String   @default("Europe/Madrid")
  operatingHoursStart   Int      @default(360)   // minutes since midnight, 06:00
  operatingHoursEnd     Int      @default(1440)  // minutes since midnight, 24:00
  terraceSeasonMonths   Int[]    @default([4, 5, 6, 7, 8, 9])
  terraceHoursStart     Int      @default(660)   // 11:00
  terraceHoursEnd       Int      @default(1380)  // 23:00
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  users     User[]
  workers   Worker[]
  weeks     ScheduleWeek[]
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  role         UserRole @default(manager)
  restaurantId String
  lastLoginAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  restaurant   Restaurant  @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  authTokens   AuthToken[]
  publishedWeeks ScheduleWeek[] @relation("PublishedBy")

  @@index([restaurantId])
}

model AuthToken {
  id         String    @id @default(cuid())
  userId     String
  tokenHash  String    @unique
  expiresAt  DateTime
  consumedAt DateTime?
  createdAt  DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

model Worker {
  id                  String        @id @default(cuid())
  restaurantId        String
  displayName         String
  qualifiedRoles      WorkerRole[]
  maxWeeklyHours      Int
  fixedDaysOff        Int[]         // ISO weekday numbers, 1=Mon..7=Sun
  annualVacationDays  Int
  archivedAt          DateTime?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  restaurant     Restaurant      @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  vacationBlocks VacationBlock[]
  shifts         Shift[]

  @@index([restaurantId])
  @@index([restaurantId, archivedAt])
}

model VacationBlock {
  id        String   @id @default(cuid())
  workerId  String
  startDate DateTime @db.Date
  endDate   DateTime @db.Date
  note      String?
  createdAt DateTime @default(now())

  worker Worker @relation(fields: [workerId], references: [id], onDelete: Cascade)

  @@index([workerId])
  @@index([workerId, startDate, endDate])
}

model ScheduleWeek {
  id                String         @id @default(cuid())
  restaurantId      String
  isoYear           Int
  isoWeek           Int            // 1..53
  status            ScheduleStatus @default(draft)
  publishedAt       DateTime?
  publishedByUserId String?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  restaurant     Restaurant      @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  publishedBy    User?           @relation("PublishedBy", fields: [publishedByUserId], references: [id])
  shifts         Shift[]
  uncoveredSlots UncoveredSlot[]

  @@unique([restaurantId, isoYear, isoWeek])
  @@index([restaurantId, status])
}

model Shift {
  id              String     @id @default(cuid())
  scheduleWeekId  String
  workerId        String
  date            DateTime   @db.Date
  startMinute     Int        // minutes since midnight in restaurant timezone
  endMinute       Int        // exclusive
  zone            Zone
  role            WorkerRole
  pinned          Boolean    @default(false)
  segmentGroupId  String?    // links the two halves of a planta_0 → terraza summer handoff
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  scheduleWeek ScheduleWeek @relation(fields: [scheduleWeekId], references: [id], onDelete: Cascade)
  worker       Worker       @relation(fields: [workerId], references: [id], onDelete: Restrict)

  @@index([scheduleWeekId])
  @@index([workerId, date])
  @@index([scheduleWeekId, date])
  @@index([segmentGroupId])
}

model UncoveredSlot {
  id             String     @id @default(cuid())
  scheduleWeekId String
  date           DateTime   @db.Date
  startMinute    Int
  endMinute      Int
  zone           Zone
  requiredRole   WorkerRole
  reasonEs       String

  scheduleWeek ScheduleWeek @relation(fields: [scheduleWeekId], references: [id], onDelete: Cascade)

  @@index([scheduleWeekId])
  @@index([scheduleWeekId, date])
}
```

Design notes:

- **Time** is stored as `minutes since midnight` (Int) plus a `Date`. Avoids DST-vs-stored-timestamp headaches; all calendar math happens in `Europe/Madrid` via `lib/time/madrid.ts`. Spec §4 hours&vacation requires "to the minute, no rounding drift" — integer minutes are the cleanest representation.
- **Days off / qualified roles / terrace season months** are native Postgres arrays. No join tables, no JSON parsing in hot paths.
- **RestaurantSettings** is folded into `Restaurant` — every overridable field is on the row, no second table needed at v1.
- **Multi-tenant scoping**: `restaurantId` on Restaurant-owned entities; `Worker.restaurantId` cascades through Vacation/Shift. Every API route filters by `session.restaurantId` before touching the DB.
- **Soft-delete workers** via `archivedAt`. Historical shifts are preserved (`onDelete: Restrict` on Shift→Worker).

---

## 4. API routes

All routes are Route Handlers under `app/api/`. JSON in/out. Every route except `/api/auth/request` and `/api/auth/verify` requires a valid session. All authed routes scope by `session.restaurantId`.

| Path | Method | Purpose | Auth |
|---|---|---|---|
| `/api/auth/request` | POST | `{ email }` → create AuthToken (hashed), email magic link via Resend. Returns 204. | Public |
| `/api/auth/verify` | GET | `?token=...` → verify, consume, set session cookie, 302 to `/panel`. | Public |
| `/api/auth/logout` | POST | Clear session cookie. 204. | Required |
| `/api/workers` | GET | List workers (`?includeArchived=false` default). | Required |
| `/api/workers` | POST | Create worker (Zod validated, qualifiedRoles ≥1). | Required |
| `/api/workers/[id]` | GET | Fetch single worker + derived vacation totals. | Required |
| `/api/workers/[id]` | PATCH | Update worker fields. | Required |
| `/api/workers/[id]` | DELETE | Soft-archive (sets `archivedAt`). | Required |
| `/api/workers/[id]/vacations` | GET | List vacation blocks for worker. | Required |
| `/api/workers/[id]/vacations` | POST | Create vacation block (validates non-overlap, available balance). | Required |
| `/api/workers/[id]/vacations/[vacationId]` | DELETE | Remove vacation block (restores balance). | Required |
| `/api/schedule/weeks` | GET | `?isoYear=&isoWeek=` → returns the week (creates a `draft` row on first hit). | Required |
| `/api/schedule/weeks/[id]` | GET | Returns week + shifts + uncoveredSlots + per-worker hour totals. | Required |
| `/api/schedule/weeks/[id]/publish` | POST | Validates zero hard violations, flips `draft`→`published`, sets `publishedAt`. | Required |
| `/api/schedule/weeks/[id]/autofill` | POST | `{ overwrite: boolean }` → runs solver. Returns `{ shiftsCreated, uncovered, durationMs }`. | Required |
| `/api/schedule/shifts` | POST | Create a shift (validates inline; persists; returns shift + fresh violation set). | Required |
| `/api/schedule/shifts/[id]` | PATCH | Update start/end/worker/zone/role/pinned. Re-validates. | Required |
| `/api/schedule/shifts/[id]` | DELETE | Delete a shift. | Required |
| `/api/summary` | GET | `?isoYear=&isoWeek=` → per-worker { hoursWeek, hoursMonth, daysWorked, vacationUsedYTD, vacationRemaining }. | Required |
| `/api/settings` | GET | Returns Restaurant settings (terrace season, operating hours, name). | Required |
| `/api/settings` | PATCH | Updates Restaurant settings (Zod validated). | Required |

Conventions:

- All handlers go through `lib/api/handler.ts` which: parses body with Zod, loads session, scopes by `restaurantId`, maps thrown `AppError` to a JSON envelope (`{ error: { code, messageEs } }`), and logs durations.
- Edits are saved per-action (spec §4 "no data loss on tab close"). No global save endpoint.
- Auto-fill is a single POST and returns the materialized state — the client refetches `/api/schedule/weeks/[id]` after success to keep one source of truth.

---

## 5. Auth flow

**Choice:** Hand-rolled magic link backed by `AuthToken` + Resend + `iron-session` sealed cookie.

**Why not Auth.js (NextAuth v5):**

- One role, one auth method, single tenant per session. Auth.js earns its weight on multi-provider, multi-role, OAuth-heavy apps.
- We need full control over the `User ↔ Restaurant` relation creation on first login (Auth.js's adapter dance is awkward for a relational scoping field that isn't `userId`).
- Auth.js's `Email` provider still requires an adapter and tables we'd build anyway (`AuthToken` exists in spec §5). Net: less code with the hand-rolled path.
- `iron-session` gives signed+encrypted cookies in 20 lines; no JWT library, no rotation logic to write.

**Flow:**

1. **Request.** User submits email on `/entrar`. `POST /api/auth/request`:
   - Look up (or create) `User` by email. If new email: provision a `User` attached to the singleton `Restaurant` (v1 has exactly one restaurant row created by `prisma/seed.ts`).
   - Generate 32-byte random token via `nanoid(32)`. Store **SHA-256 hash** in `AuthToken.tokenHash`, set `expiresAt = now + 15 min`.
   - Send email via Resend using `lib/email/magic-link.tsx`. The link is `${NEXT_PUBLIC_APP_URL}/api/auth/verify?token=<plaintext>`.
   - Respond 204 regardless of whether the email exists (no user enumeration).
2. **User clicks link.** Browser hits `GET /api/auth/verify?token=...`:
   - Hash the incoming token, look up `AuthToken` by `tokenHash`.
   - Reject if missing, `expiresAt < now`, or `consumedAt != null`.
   - Set `consumedAt = now`. Update `User.lastLoginAt`.
   - Seal a session via iron-session: `{ userId, restaurantId, role }`. Set cookie `jornada_session`, HttpOnly, Secure, SameSite=Lax, 30-day rolling expiry.
   - 302 redirect to `/panel`.
3. **Subsequent requests.** `middleware.ts` runs on every `(app)/*` path:
   - Unseal cookie. If missing/invalid → 302 to `/entrar`.
   - Otherwise inject nothing; route handlers re-load the session via `getSession()` so they get the latest server-side state.
4. **Route handlers.** `requireSession()` in `lib/auth/middleware-helpers.ts` is the single guard. Throws `AppError("UNAUTHORIZED", 401)` if no session.
5. **Logout.** `POST /api/auth/logout` destroys the session cookie. Client redirects to `/entrar`.

Token hygiene: a daily best-effort cleanup happens implicitly — every `request` handler deletes expired tokens for that user before issuing a new one. No cron required.

---

## 6. Env vars

| Name | Example | Source | Local | Vercel Prod | Vercel Preview |
|---|---|---|---|---|---|
| `DATABASE_URL` | `postgres://...neon.tech/jornada?sslmode=require&pgbouncer=true&connect_timeout=10` | Neon dashboard → project → Connection Details → **Pooled** | yes | yes | yes |
| `DIRECT_URL` | `postgres://...neon.tech/jornada?sslmode=require` | Neon dashboard → **Direct** (same project, non-pooled) | yes | yes | yes |
| `RESEND_API_KEY` | `re_abc...` | Resend dashboard → API Keys → Create | yes | yes | yes |
| `RESEND_FROM_EMAIL` | `Jornada <hola@jornada.app>` (or `onboarding@resend.dev` while testing) | Resend → Domains (must be verified) | yes | yes | yes |
| `SESSION_SECRET` | 32+ random chars: `openssl rand -base64 32` | Generate locally; same value across envs is fine, different is safer | yes | yes | yes |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` / `https://jornada.vercel.app` | Local: localhost. Prod: your Vercel URL after first deploy | yes | yes | yes |
| `NODE_ENV` | `development` / `production` | Auto-set by Next/Vercel | auto | auto | auto |

`.env.example` ships with these names and placeholder values. `.env.local` is gitignored. Forge must add validation in `lib/env.ts` that throws on missing required vars at boot.

---

## 7. Third-party setup steps

### Neon Postgres

1. Sign up / log in at https://console.neon.tech.
2. **New Project**: name `jornada`, region `eu-central-1 (Frankfurt)` (closest to Vercel `fra1`).
3. Default branch is `main`. In **Connection Details**:
   - Toggle **Pooled connection** ON → copy as `DATABASE_URL`. Confirm it contains `pgbouncer=true`.
   - Toggle **Pooled connection** OFF → copy as `DIRECT_URL`.
4. Optional: create a second Neon branch `preview` for Vercel preview deploys; use its pooled+direct URLs for Vercel **Preview** env. Launch scale tolerates pointing prod and preview at the same branch; revisit if needed.
5. From local machine: `pnpm prisma migrate dev --name init` runs against `DIRECT_URL`. The first migration creates all tables.

### Resend

1. Sign up / log in at https://resend.com.
2. **API Keys** → **Create API Key**: name `jornada-prod`, permission `Sending access` only, copy as `RESEND_API_KEY`.
3. **Domains**:
   - Fast path for v1: use `onboarding@resend.dev` as `RESEND_FROM_EMAIL`. Works immediately; subject to Resend's testing limits but sufficient for one manager's magic links.
   - Custom domain path (post-launch): add `jornada.app` (or whichever domain), copy the DNS records to your registrar, wait for verification, then set `RESEND_FROM_EMAIL=Jornada <hola@yourdomain.com>`.
4. **Audience** is not used in v1. Magic-link delivery uses the transactional API only.

### Vercel

1. Sign up / log in at https://vercel.com.
2. **Add New → Project** → import the Jornada GitHub repo.
3. Framework preset auto-detects **Next.js**. Override build command if needed (see §8).
4. **Environment Variables** → paste every value from §6 into **Production**, **Preview**, and **Development** as marked. Mark all as Sensitive except `NEXT_PUBLIC_APP_URL`.
5. Deploy. Copy the assigned `*.vercel.app` URL into `NEXT_PUBLIC_APP_URL` for Production and redeploy.

---

## 8. Deploy strategy

| Setting | Value |
|---|---|
| **Framework preset** | Next.js |
| **Build command** | `prisma generate && prisma migrate deploy && next build` |
| **Install command** | `pnpm install --frozen-lockfile` (or `npm ci` if not using pnpm) |
| **Output directory** | `.next` (default) |
| **Node version** | `20.x` (set in `package.json` `engines.node`) |
| **Production branch** | `main` (auto-deploys on push) |
| **Preview deploys** | Every PR opened against `main` |
| **Regions** | `fra1` (Frankfurt) — closest to Madrid + matches Neon region |
| **Cron / background** | none in v1 |

Notes:

- `prisma generate` is required because Vercel build caches don't reliably hit the postinstall hook on monorepos and pinned lockfiles. Putting it in the build command is the safe default.
- `prisma migrate deploy` runs against `DIRECT_URL` during build, applying any pending migrations to production Neon. Safe for additive migrations; risky migrations (column rename, type narrow) require a feature flag + two-step deploy — call it out in PR review.
- Vercel functions default to Node runtime; do **not** force `runtime = "edge"` on auth or scheduler routes — Prisma needs Node.
- `middleware.ts` runs on edge (default) and only checks the session cookie's existence; the heavy unseal+DB check happens inside the route handler.

---

## 9. Risk register

Ranked by exposure (probability × impact). Each has a primary mitigation.

| # | Risk | P | I | Mitigation |
|---|---|---|---|---|
| 1 | **Auto-fill correctness on hard constraints.** Subtle off-by-one in coverage propagation, or a missing constraint check, lets the solver assign an invalid shift. Manager loses trust on day one. | M | H | Solver hard constraints in `lib/scheduler/propagate.ts` are re-checked by the same `lib/scheduler/validate.ts` used for inline edits. Tests in `tests/scheduler/` cover the spec's 9 hard constraints with named fixtures (feasible / infeasible / partial). Publish endpoint re-runs validation server-side. |
| 2 | **Auto-fill latency at scale or in pathological cases.** Backtracking blows up if coverage is dense and qualified workers are sparse. | M | M | 10s server-side timeout in the autofill handler. Solver emits partial result + `UncoveredSlot`s on timeout; spec §4 already mandates partial-over-empty. Benchmark in `tests/scheduler/` against 20-worker fixture; alert if p95 >5s. |
| 3 | **Neon connection pooling in serverless.** Cold starts open a fresh Prisma client; without pooled URL, Neon connection limits get hit. | M | H | Use Neon **pooled** URL for `DATABASE_URL` (PgBouncer); reserve `DIRECT_URL` for migrations only. Prisma singleton in `lib/db.ts` guards against per-request client creation in dev. |
| 4 | **Magic-link deliverability.** Resend marks the message as spam, or a corporate gateway eats it; the manager can't log in. | M | H | Use Resend's `onboarding@resend.dev` for v1 to inherit Resend's reputation; manager whitelists the address on first failure. Add a "Resend link" button on `/entrar/revisa`. Log Resend message IDs for support. |
| 5 | **Timezone bugs on the week grid.** Storing minutes-since-midnight plus a Date is correct only if every render path goes through `lib/time/madrid.ts`. Drift around DST transitions could shift a shift visually. | M | M | All time math centralized in `lib/time/`; no `new Date()` in components. Tests cover the two DST transitions for Europe/Madrid. UI never formats dates with the browser locale — always via `date-fns-tz` with `"Europe/Madrid"`. |
| 6 | **i18n scaffolding without an EN dictionary.** Building the framework but only loading one locale is a common trap — devs sprinkle hardcoded Spanish strings and the EN add later is a refactor. | M | L | One enforced rule: no string literals in JSX in `components/` or `app/`. Every visible string flows through `t(key)`. Solver-emitted Spanish reasons live in `lib/scheduler/uncovered.ts` keyed by code, also mirrored in the dictionary. |
| 7 | **Soft-delete vs. historical integrity.** Archiving a worker who has shifts in past weeks must preserve history but exclude them from Auto-fill candidate pools. Easy to forget one of those two. | L | M | `archivedAt` filter is applied in `lib/scheduler/inputs.ts` (the only loader Auto-fill uses) and `GET /api/workers?includeArchived=false`. Shift→Worker FK is `onDelete: Restrict`. |
| 8 | **Session secret rotation.** Rotating `SESSION_SECRET` invalidates every active session silently — manager mid-task gets bounced to `/entrar`. | L | L | iron-session supports key rotation via a list. Document the rotation runbook in the README before launch; v1 ships with a single key. |

---

Blueprint done. Hand off to Forge.
