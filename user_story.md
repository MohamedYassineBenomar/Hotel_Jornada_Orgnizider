**Who it's for**
The manager of a hotel restaurant in Barcelona, Spain. The manager schedules a small team of restaurant workers across the restaurant's zones, shifts, and seasons.

**Problem it solves**
Right now the manager builds the weekly "jornadas" (shift schedules) by hand — juggling worker roles, max hours, days off, vacation balances, zone coverage, and seasonal changes. It's slow, error-prone, and hard to keep an accurate running total of hours worked and vacation used. I want a SaaS that auto-proposes the schedule based on the rules below, and tracks hours and vacation automatically.

**The restaurant**
- One hotel restaurant in Barcelona, open 7 days a week.
- Operating window: 06:00 to 24:00.
- Two areas:
  - **Planta 0 (ground floor)**: sala (dining room), barra (bar), cocina (kitchen).
  - **Terraza (rooftop)**: open only April–September, hours 11:00 to 23:00.
- The cocinero/ayudante de cocinero only work in the kitchen on planta 0 — never the terrace.
- At least one camarero OR ayudante de camarero must always be on the floor during opening hours.
- In summer (terrace season), one waiter/assistant must be permanently on the terrace from 11:00 until close — even if they started their shift on planta 0 and have to go upstairs at 11:00.

**Worker roles**
- Camarero (waiter)
- Ayudante de camarero (waiter's assistant)
- Cocinero (cook)
- Ayudante de cocinero (cook's assistant)
- Some workers are qualified for more than one role — this must be capturable per worker.

**Typical shift patterns the manager uses today**
- One camarero opens at 06:00.
- More camareros and ayudantes arrive at 08:00.
- Common split: worker A does 06:00–15:00, worker B does 15:00–23:00.
- In summer, someone shifts up to the terrace at 11:00 and stays there until end of shift.

**Core user flow (as I imagine it)**
1. Manager logs in and lands on a clean dashboard.
2. **Workers page** — full CRUD for workers. Per worker: name, role(s) they can perform, max weekly hours, fixed days off, vacation days allotted / used / remaining.
3. **Schedule page** — calendar view (week and month). Grid runs 06:00 to 24:00. Manager sees who is working where and when at a glance.
4. **Auto-fill jornadas** — the app proposes a full schedule based on:
   - Coverage rules (≥1 camarero/ayudante on the floor at all times; terraza covered 11:00–23:00 in summer; cocinero in the kitchen during meal services).
   - Each worker's max hours, days off, and vacation.
   - Standard shift patterns (06–15, 15–23, etc.) and the 11:00 terrace handoff in summer.
   Manager can review and adjust before publishing.
5. **Hours & vacation page** — per worker: hours worked this week / month, days worked, vacation days used and remaining.
6. **Season toggle** — terrace and its coverage rule only apply April–September.

**Must-haves**
- Friendly, clean UI — the manager is not technical.
- Auto-fill must respect every coverage rule and per-worker limit above.
- Hosted SaaS, accessible from any device, anywhere.
- Spanish-first UI (bilingual ES/EN is fine, but ES must feel native — the role names stay in Spanish).

**Good to know**
- One restaurant for now, but please don't model anything that blocks adding a second location later.
- Only the manager logs in. Workers don't have accounts in v1.
