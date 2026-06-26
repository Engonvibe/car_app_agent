# MOT-UK — Project Report

A UK-based AI Car Service & MOT Management App.
Mobile-first web app (React) with a Node/Express + Prisma/PostgreSQL backend,
wrapped with Capacitor so it can be packaged for Android.

> This document is a write-up aid for a college submission. Pair it with the
> code, the `README.md` (how to run), `docs/DEPLOYMENT.md` (hosting) and
> `docs/ANDROID.md` (Android build).

---

## 1. Project overview

The app helps a UK driver manage their vehicles and keep on top of MOT and
servicing. Users can:

- Register / log in (per-user data, secure password hashing).
- Build a vehicle profile (UK brands, dependent models, fuel/vehicle types).
- Record MOT & service entries manually **or by voice**.
- See an **auto, explainable Recommended Service Date** that varies by vehicle.
- Track the **UK MOT due date** separately from the recommended service date.
- View a **bar-chart dashboard**, run **date-range reports**, and get
  **reminders** (Upcoming / Due / Overdue).
- Share a vehicle with other users via **roles** (Owner / Editor / Viewer).

---

## 2. Technology stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + TypeScript + Vite | Fast, modern, type-safe, mobile-friendly |
| Charts | Recharts (bar charts only) | Simple declarative charts |
| Backend | Node.js + Express + TypeScript | Lightweight, easy to read |
| ORM | Prisma | Type-safe DB access, easy migrations |
| Database | PostgreSQL | Real relational persistence |
| Auth | bcrypt + JWT | Hashed passwords, stateless tokens |
| Mobile | Capacitor | Wrap the web app as an Android app |

---

## 3. Architecture

```
┌────────────────────────────┐        HTTPS / JSON        ┌──────────────────────────┐
│  Frontend (React + Vite)   │  ───────────────────────▶  │  Backend (Express API)   │
│  - screens & components    │   Authorization: Bearer    │  - auth + middleware     │
│  - lib/api.ts (fetch)      │ ◀───────────────────────   │  - vehicles / entries    │
│  - lib/prediction.ts (live)│                            │  - dashboard/reports/... │
│  - lib/voiceParse.ts       │                            │  - prediction.ts         │
└────────────────────────────┘                            └────────────┬─────────────┘
        │ Capacitor (Android wrapper)                                   │ Prisma
        ▼                                                               ▼
   Android app                                                   PostgreSQL (5 tables)
```

Key design choices:
- **Backend is the source of truth** for the prediction; the frontend mirrors
  the same rules (`lib/prediction.ts`, `lib/dates.ts`) so previews are instant
  and match what is saved.
- **All data endpoints require a token**; data is scoped to the logged-in user.
- **Recommended Service Date** is always derived; **MOT Due Date** is a separate
  stored field that the predictor never touches.

---

## 4. Data model (Prisma / PostgreSQL)

| Table | Purpose | Notable fields |
|---|---|---|
| `users` | Accounts | `email` (unique), `passwordHash` (bcrypt) |
| `roles` | Global role lookup (legacy) | `name` |
| `vehicles` | Vehicle profiles | brand, model, registeredYear, fuelType, reg no., mileage, `ownerId` |
| `service_entries` | MOT/service records | entryType, serviceType, category, `serviceDate`, `recommendedServiceDate`, `motDueDate` (separate), amount, status, notes |
| `vehicle_access` | Per-vehicle sharing | `(vehicleId, userId)` unique, `role` = Editor/Viewer |
| `reminders` | (reserved) | reminder date/status |

Permissions: **Owner** = full control; **Editor** = add/edit entries;
**Viewer** = read-only. Enforced server-side and reflected in the UI.

---

## 5. Agentic workflow — roles used

The project was built as if by a small software team, each "agent" focused on
one concern. This maps directly to how the work was actually carried out:

| Agent role | Contribution |
|---|---|
| Project Manager | Split the work into 10 incremental, testable phases suitable for a beginner. |
| Code Inspector | Phase 1 inspection of the (empty) repo; confirmed a clean-start build. |
| UI/UX | Mobile-first layout, bottom nav, cards/forms, polish pass (Phase 10). |
| Vehicle Data | Reusable `ukVehicles.ts` (UK brands, dependent models, fuel/types). |
| Car Builder | Vehicle profile create/edit/delete with searchable brand dropdown. |
| Frontend | All screens: Dashboard, Add Entry, Reports, Reminders, Vehicles, Settings, Login/Register. |
| Backend | Express API, validation, Prisma data access. |
| Database | Prisma schema, migrations, seed script. |
| Voice/NLP | Web Speech capture + rule-based extraction + preview/correct flow. |
| Prediction | Explainable rule-based recommended-date engine. |
| QA/Test | Build/type-check + live API tests every phase. |
| Supervisor | Phase approval checklists; honest status reporting. |

---

## 6. Phase-by-phase summary

| Phase | Delivered |
|---|---|
| 1 | Repository inspection report (found empty repo) |
| 2 | Foundation: frontend + backend + Prisma schema, runs end-to-end |
| 3 | Vehicle data + car builder (searchable brand, dependent model, CRUD) |
| 4 | Add/View/Edit/Delete service & MOT entries; flexible UK dates |
| 5 | Dashboard bar charts, date-range reports, reminders |
| 6 | Smart, explainable rule-based prediction engine |
| 7 | Voice input (speech → fill form → preview → correct → save) |
| 8 | Authentication + per-vehicle roles (Owner/Editor/Viewer) |
| 9 | Hidden internal validation / evaluation screen |
| 10 | Final polish + Capacitor Android preparation |

---

## 7. Key features vs requirements

- ✅ Mobile-based professional interface; **bar charts only** on the dashboard.
- ✅ Manual + **voice** entry; voice fills a form, shows a transcript, allows
  correction, and requires a manual Save.
- ✅ Flexible date input (`12/05/2024`, `12 May 2024`, `2024-05-12`) stored
  internally as `YYYY-MM-DD` (UK day-first).
- ✅ Every entry has **View / Edit / Delete**.
- ✅ Recommended Service Date **auto-updates** when the service date / vehicle /
  service type / category changes.
- ✅ Reports show **From Date** and **To Date** side by side.
- ✅ Labels: **Vehicle Brand Name**, **Registered Year**, **Fuel Type**.
- ✅ Searchable brand dropdown; **dependent** model dropdown; **Other Model**;
  **Other / Imported Vehicle**.
- ✅ The **Validation Model** is hidden from all navigation (internal route only).
- ✅ Predictions vary by brand, model, fuel, registered year, mileage, service
  type, category and service history.
- ✅ UK MOT due date and recommended service date are treated separately.
- ✅ Supports normal, foreign, luxury, supercar, EV, imported and classic
  vehicles (data + prediction rules).

---

## 8. Testing approach

- **Per phase:** backend `tsc` build + live API tests (curl) and frontend
  `tsc --noEmit` + `vite build`; the dev servers were started and hit.
- **Auth/roles:** verified 401 when logged out, wrong-password rejection,
  ownership scoping, assign/remove access, and that Viewer/Editor/Owner can do
  exactly what they should (and nothing more).
- **Prediction:** verified the recommended date changes across fuel, mileage,
  age, brand/model, category, service type and history.
- **NLP/voice:** the real parser is evaluated over 13 labelled sample sentences
  on the internal Validation screen (Precision/Recall/F1 ≈ 98.6%).

---

## 9. Evaluation (internal screen)

The hidden `/internal/validation-model` page shows:
- **NLP/voice** Precision/Recall/F1 (computed live; sample data).
- **Recommendation** Precision@K / Recall@K / NDCG (sample).
- **Reminder timing** MAE / Accuracy / Time deviation (sample).
- **Feasibility** checklist with honest Done / Prototype / Pending statuses.
- **User evaluation** placeholders (Pending / To be completed).

---

## 10. Limitations & future work

- Prediction is rule-based (explainable), not machine-learned — by design for a
  college project; a future version could learn intervals from real history.
- Voice extraction is rule-based and works best with clear phrasing; it doesn't
  understand relative dates ("last Tuesday") or worded amounts ("one hundred").
- Real user testing (SUS, task time, etc.) is not yet done — placeholders shown.
- JWT is stored in `localStorage` (fine for a project; production would prefer
  httpOnly cookies).

---

## 11. Screenshots (add your own)

Run the app, then capture each screen and drop the images here:

- `docs/screenshots/login.png`
- `docs/screenshots/dashboard.png`
- `docs/screenshots/add-entry.png`
- `docs/screenshots/vehicles-roles.png`
- `docs/screenshots/reports.png`
- `docs/screenshots/reminders.png`

---

## 12. How to run

See `README.md` for full steps (install, `DATABASE_URL`, Prisma migrate, seed
demo users, run frontend/backend). Hosting: `docs/DEPLOYMENT.md`. Android:
`docs/ANDROID.md`.
