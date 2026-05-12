# Jornada — Spec

## 1. One-liner

Jornada auto-builds a rule-compliant weekly shift schedule for a hotel-restaurant manager in seconds, so the manager can stop juggling spreadsheets and start tweaking and publishing instead of building from scratch.

## 2. User & problem

**Primary user.** The manager of a single hotel restaurant in Barcelona, Spain. Non-technical. Schedules a team of ~10–20 workers across roles (camarero, ayudante de camarero, cocinero, ayudante de cocinero), zones (planta 0: sala/barra/cocina; terraza in summer), and a 06:00–24:00 daily window.

**The problem.** Today the manager builds the weekly *jornada* by hand, juggling:

- Per-worker constraints — max weekly hours, fixed days off, vacation balance.
- Multi-role qualifications — some workers can do more than one role.
- Coverage rules — at least one waiter on the floor at all times, terrace permanently staffed 11:00–23:00 April–September, kitchen always covered during service.
- Standard shift patterns — 06–15 opener, 15–23 closer, the 11:00 terrace handoff in summer.

It is slow, error-prone, and gives no reliable running total of hours worked or vacation consumed.

**Why now.** A single-tenant manager doing this in Excel is the highest-leverage tool a non-technical user can adopt: one Auto-fill click replaces an afternoon of mental load.

**Magic moment.** Manager clicks *Auto-llenar* on an empty week and within a few seconds sees a fully drafted, rule-compliant schedule — every shift assigned, every coverage rule satisfied, hours and vacation correctly debited — ready to tweak and publish.

## 3. Primary user flow (happy path)

1. **Land.** Manager visits the marketing route (or the app directly) and clicks *Entrar*.
2. **Magic-link login.** Enters email; Resend delivers a magic link; clicking it logs the manager in (passwordless). Session persists in a cookie.
3. **Dashboard.** Lands on a clean dashboard: current week summary (workers scheduled, hours assigned, coverage gaps if any) and a primary CTA *Ver horario*.
4. **Workers setup (first run).** Goes to *Trabajadores* and adds each worker — name, role(s) they can perform, contracted max weekly hours, fixed days off, annual vacation allotment.
5. **Schedule view.** Opens *Horario* → week view, defaulted to the current week. Grid runs 06:00–24:00 on the Y axis, Lun–Dom on the X axis, with a zone filter (Planta 0 / Terraza) and a role legend.
6. **Auto-fill.** Clicks *Auto-llenar semana*. The solver runs server-side and produces a draft week of shifts respecting every coverage rule and per-worker constraint. The UI surfaces:
   - Filled shifts in role-coded colors.
   - Uncovered slots (if the solver couldn't fully satisfy coverage) clearly flagged in red with a per-slot reason ("Falta cocinero 14:00–15:00").
7. **Tweak.** Manager drags, edits, or deletes individual shifts. Each edit re-validates coverage and per-worker constraints inline; violations are flagged (yellow = warning, red = hard violation).
8. **Publish.** Clicks *Publicar*. The week's status flips from `draft` to `published`. Hours and vacation totals are recomputed and reflected in *Horas y vacaciones*.
9. **Track.** Opens *Horas y vacaciones* to see per-worker hours this week/month, days worked, vacation used, vacation remaining.
10. **Season toggle.** When the manager flips the *Temporada de terraza* control (or it auto-engages based on month), Auto-fill begins enforcing terrace coverage 11:00–23:00 and the 11:00 handoff pattern.

## 4. Acceptance criteria

All criteria are testable. Forge must implement against them; Launch must verify them end-to-end.

### Auth

- Visiting any authenticated route while logged out redirects to `/entrar`.
- Submitting a valid email on `/entrar` triggers a Resend email containing a single-use magic link valid for ≥10 minutes.
- Clicking the magic link logs the user in and lands them on `/panel`.
- Only users with role `manager` can access app routes; v1 ships with `manager` as the only role.
- Logout clears the session and redirects to `/entrar`.

### Workers (CRUD)

- Manager can create, read, update, and soft-delete (archive) a worker.
- Per worker the system stores: display name, one or more `qualifiedRoles`, contracted `maxWeeklyHours` (integer), `fixedDaysOff` (subset of Lun–Dom), `annualVacationDays` (integer), `vacationDaysUsed` (computed), `vacationDaysRemaining` (derived).
- Saving a worker with zero `qualifiedRoles` is blocked with an inline error.
- Archived workers do not appear in Auto-fill candidate pools but remain visible in historical schedules.

### Vacation (manual entry by manager)

- Manager can add a vacation block to a worker — start date, end date (inclusive), optional note.
- Vacation blocks subtract from that worker's `vacationDaysRemaining` immediately on save.
- Auto-fill must never assign a shift to a worker whose vacation block overlaps that day.
- Removing a vacation block restores those days to `vacationDaysRemaining`.

### Schedule grid (week view)

- Week view defaults to the current ISO week (Mon–Sun) in `Europe/Madrid`.
- Grid Y axis: hours 06:00–24:00 in 30-minute resolution. X axis: 7 days.
- Each shift renders as a block colored by role, labeled with worker name, role, and zone.
- Manager can switch zone filter: *Todas* / *Planta 0* / *Terraza*.
- Manager can navigate to previous/next week and jump to *Hoy*.
- Month view is built but flagged as a stretch goal — see §8 Out of scope rules of engagement.

### Shift editing

- Manager can create a shift inline by dragging on the grid (start, end, worker, zone, role).
- Manager can edit start/end/worker/zone/role of an existing shift.
- Manager can delete a shift.
- On every change the UI re-runs validation and shows badges:
  - **Red (hard violation):** coverage rule broken, worker double-booked, worker on vacation, worker on a fixed day off, worker over `maxWeeklyHours`.
  - **Yellow (soft warning):** worker within 1 hour of `maxWeeklyHours`, shift shorter than 4 hours, shift longer than 10 hours.
- A week cannot be `published` while any hard violation exists; the *Publicar* button is disabled with the reason listed.

### Auto-fill (the magic-moment feature)

- Trigger: button *Auto-llenar semana* on the current draft week. Confirms before overwriting any existing draft shifts.
- The solver must respect, as hard constraints:
  1. **Floor coverage.** At every minute from 06:00 to 24:00 every open day, at least one worker whose qualified role is `camarero` OR `ayudante_camarero` is on shift in zone `planta_0`.
  2. **Terrace coverage (summer only).** When the date falls in the active terrace season (default: months 4–9 inclusive, i.e. April–September; toggleable per restaurant), at every minute from 11:00 to 23:00 at least one worker whose qualified role is `camarero` OR `ayudante_camarero` is on shift in zone `terraza`.
  3. **Kitchen coverage.** At every minute from 06:00 to 24:00, at least one worker whose qualified role is `cocinero` OR `ayudante_cocinero` is on shift in zone `planta_0` (kitchen).
  4. **Cooks never on terraza.** No shift with role `cocinero` or `ayudante_cocinero` is assigned `zone = terraza`.
  5. **Per-worker max hours.** Sum of a worker's assigned shift hours in the ISO week ≤ `maxWeeklyHours`.
  6. **Days off.** No shift assigned to a worker on any weekday in their `fixedDaysOff`.
  7. **Vacation.** No shift assigned on any day overlapping a vacation block for that worker.
  8. **No double-booking.** A worker cannot have two overlapping shifts.
  9. **Role-zone validity.** Shift's role must be in the worker's `qualifiedRoles`.
- The solver must prefer, as soft preferences (in priority order):
  - Standard shift templates: opener 06:00–15:00, closer 15:00–23:00, and a cocinero second-shift starting at 14:00 or 15:00.
  - In summer, a single waiter/assistant who started on `planta_0` at 06:00 or 08:00 transitions to `terraza` at 11:00 and stays there until end of their shift (modeled as two contiguous shift segments on the same worker).
  - Even distribution of weekly hours across qualified workers (no one starved, no one maxed).
  - Honoring any draft shifts the manager already pinned (the manager can mark a shift *Fijar* to lock it before running Auto-fill).
- **Infeasibility.** If the solver cannot satisfy every hard constraint, it returns a *partial* schedule:
  - It fills as much as possible respecting hard constraints it can satisfy.
  - Every uncovered minute is emitted as an `UncoveredSlot` row with `date`, `start`, `end`, `zone`, `requiredRole`, and a human-readable Spanish reason.
  - The UI renders uncovered slots as red blocks on the grid.
  - The solver MUST NOT refuse to return anything. Partial is always better than empty.
- Auto-fill completes in ≤10 seconds for the launch scale (≤20 workers, 7-day week).
- Re-running Auto-fill on a week with existing shifts shows a confirmation dialog before overwriting.

### Hours & vacation page

- Per worker, the page shows: hours assigned this ISO week, hours assigned this calendar month, days worked this week, vacation days used YTD, vacation days remaining.
- "Hours assigned" counts only `published` shifts plus the active `draft` if the manager is viewing the current week (the active draft is labeled as provisional).
- Totals match what is rendered on the grid to the minute (no rounding drift).

### Season toggle

- Each restaurant has a `terraceSeason` setting: a list of active months (defaults to `[4,5,6,7,8,9]`) and active hours (defaults to `11:00–23:00`).
- Manager can override which months count as terrace season from a *Ajustes* page.
- Auto-fill, validation, and the grid's *Terraza* filter all key off this setting — not a hardcoded month list.

### Internationalization

- All user-facing copy is loaded from a translation dictionary keyed by locale; v1 ships only `es-ES`.
- The framework supports adding `en` later by dropping in a second locale dictionary, with no string-extraction refactor required.
- Role names (`camarero`, `ayudante de camarero`, `cocinero`, `ayudante de cocinero`) remain in Spanish in every locale.

### Performance & reliability

- p95 page load for `/horario` (week view) ≤ 2s on a typical connection at launch scale.
- Auto-fill responds in ≤10s p95.
- No data loss on accidental tab close — edits are saved per-action, not on a global *Save* button.

## 5. Data model (logical)

Entities and key fields only. Multi-tenant capable from day one — every operational entity is scoped to a `Restaurant`, even though v1 ships one row.

- **Restaurant**
  - `id`, `name`, `timezone` (default `Europe/Madrid`)
  - `operatingHoursStart`, `operatingHoursEnd` (defaults 06:00, 24:00)
  - `terraceSeasonMonths` (set of month numbers, default {4,5,6,7,8,9})
  - `terraceHoursStart`, `terraceHoursEnd` (defaults 11:00, 23:00)

- **User**
  - `id`, `email`, `role` (enum: `manager`)
  - `restaurantId` (FK → Restaurant)
  - `lastLoginAt`

- **AuthToken** (for magic links)
  - `id`, `userId`, `tokenHash`, `expiresAt`, `consumedAt`

- **Worker**
  - `id`, `restaurantId`, `displayName`
  - `qualifiedRoles` (set of: `camarero`, `ayudante_camarero`, `cocinero`, `ayudante_cocinero`)
  - `maxWeeklyHours` (integer)
  - `fixedDaysOff` (set of weekday numbers 1–7, Mon=1)
  - `annualVacationDays` (integer)
  - `archivedAt` (nullable)

- **VacationBlock**
  - `id`, `workerId`, `startDate`, `endDate`, `note`

- **ScheduleWeek**
  - `id`, `restaurantId`, `isoYear`, `isoWeek`
  - `status` (enum: `draft`, `published`)
  - `publishedAt` (nullable), `publishedByUserId` (nullable)

- **Shift**
  - `id`, `scheduleWeekId`, `workerId`, `date`
  - `startTime`, `endTime` (within operating hours)
  - `zone` (enum: `planta_0`, `terraza`)
  - `role` (enum, must be in worker's `qualifiedRoles`)
  - `pinned` (boolean — protects from Auto-fill overwrite)
  - `segmentGroupId` (nullable — links the two halves of a planta_0 → terraza summer handoff)

- **UncoveredSlot** (emitted by Auto-fill when infeasible)
  - `id`, `scheduleWeekId`, `date`, `startTime`, `endTime`
  - `zone`, `requiredRole` (which role would have filled it)
  - `reasonEs` (human-readable Spanish reason)

- **RestaurantSettings** (single row per restaurant; can be folded into Restaurant if simpler)
  - Anything overridable per-restaurant: shift template defaults, soft-preference weights.

Indexing intent (for Blueprint, not exhaustive): unique `(restaurantId, isoYear, isoWeek)` on ScheduleWeek; `(workerId, date)` on Shift for fast per-worker lookups; `(scheduleWeekId)` on Shift and UncoveredSlot.

## 6. External integrations

| Integration | Purpose | Secret(s) needed |
|---|---|---|
| **Neon Postgres** | Primary database (via Prisma) | `DATABASE_URL` (pooled), `DIRECT_URL` (direct, for migrations) |
| **Resend** | Magic-link email delivery | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| **Vercel** | Hosting + CI/CD | Configured via Vercel CLI; no app-level secret |

That's the entire dependency tree. Explicitly **not** integrated in v1: Stripe, Sentry, push notifications, SMS, calendar sync, CSV/PDF export libraries, analytics SDKs.

## 7. Brand

- **Name:** **Jornada** (Spanish for "workday / shift") — single-word, no tagline at launch.
- **Vibe in 3 words:** *clean, warm, confident*. Linear's precision and information density meets the hospitality warmth of Resy — utilitarian where it must be, hospitable where it can be.
- **Reference sites:** Linear (linear.app) for grid density, keyboard-feel, and quiet color use; Resy (resy.com) for warmth, typography, and a feeling that hospitality professionals actually use this.
- **Palette intent (Polish will finalize):** off-white canvas, deep ink for text, one warm accent for primary actions, role-coded badge colors for the schedule grid that read clearly without screaming.
- **Voice:** professional Spanish, second-person plural (*usted* is too cold; *tú* is right for a small-team SaaS).

## 8. Out of scope (v1)

Explicitly **not** in scope. Cutting these is what makes the MVP shippable.

- Push notifications or email notifications to workers.
- PDF or CSV export of the schedule.
- Worker logins or any worker-facing UI.
- Multi-restaurant UI (the data model permits it; the UI does not expose it).
- Audit log of who changed which shift when.
- Payroll, labor cost, or wage calculations.
- Shift-swap requests, shift bidding, or worker-initiated changes.
- Bilingual UI (EN). i18n scaffolding ships; the EN dictionary does not.
- Custom domain. Ship on `*.vercel.app`; bring a custom domain post-launch.
- Stripe, billing, paywalls.
- Sentry or third-party error reporting in v1.

**First thing to cut if scope blows up:** the month view on `/horario`. Week view is the must-have; month view ships only if everything else is green. Bilingual UI is already deferred and cannot be cut further.

## 9. Deploy target

- **Hosting:** Vercel (Next.js App Router).
- **Database:** Neon Postgres (free tier sufficient for launch scale; pooled URL for serverless, direct URL for `prisma migrate`).
- **Email:** Resend (free tier; verified sender on a placeholder domain Vercel provides or a free domain — manager only needs ~1 magic link per session).
- **Domain (v1):** `jornada.vercel.app` (or whatever subdomain is free at deploy time).
- **Domain (post-launch):** TBD custom domain; out of scope for the MVP cut.
- **Environments:** Production on `main`; Vercel preview deploys on every PR; one Neon branch per environment (production + preview pooled to a single dev branch is acceptable at launch scale).
- **Region:** Vercel default (closest to `Europe/Madrid` available — `cdg1` or `fra1`). Neon region matched to minimize cross-region latency.

Spec done. Hand off to Blueprint.
