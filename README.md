# MOT-UK-Final

A **UK-based AI Car Service & MOT Management App**.

This is a mobile-responsive web app (built first as a web app, and made
**Capacitor-friendly** so it can be wrapped into an Android app in a later phase).

> **Project status: Phase 2 — Foundation only.**
> This phase sets up the project structure, a running frontend, a running
> backend with a health route, and the database schema (Prisma + PostgreSQL).
> Features like login, voice input, charts, reports and prediction logic are
> **intentionally not built yet** — they come in later phases.

---

## Documentation

- [`docs/PROJECT_REPORT.md`](docs/PROJECT_REPORT.md) — architecture, phases, agent roles, features, testing (write-up aid).
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — host the database, backend and frontend for a live demo.
- [`docs/ANDROID.md`](docs/ANDROID.md) — build the Android app, set the app icon and splash.

## 1. Project structure

```
MOT-UK-Final/
├── frontend/        React + TypeScript + Vite (mobile-responsive UI)
│   └── src/
│       ├── components/   Layout + bottom navigation
│       └── pages/        Placeholder screens
├── backend/         Node.js + Express + TypeScript API
│   ├── src/             Server entry + health route
│   └── prisma/          Prisma schema (database tables)
├── .gitignore
└── README.md        (this file)
```

> **Note on Prisma:** the Prisma schema lives inside `backend/prisma/` because
> the backend is the only part of the app that talks to the database. This is
> the standard, beginner-friendly layout and keeps the `DATABASE_URL` in one
> place (the backend `.env`).

---

## Accounts & roles (Phase 8)

The app requires login. Passwords are hashed with bcrypt and never stored in
plain text; login returns a JWT token that the frontend stores and sends on
each request. Set `AUTH_SECRET` in `backend/.env` (see `.env.example`).

Seed demo accounts and sample data with `npm run seed` (in `backend/`):

| Role | Email | Password |
|---|---|---|
| Owner | demo@motcare.local | password123 |
| Editor | editor@motcare.local | password123 |
| Viewer | viewer@motcare.local | password123 |

Per-vehicle roles:
- **Owner** — full control: edit/delete the vehicle, manage users, add/edit/delete entries.
- **Editor** — can add/edit service entries (cannot delete the vehicle or manage users).
- **Viewer** — read-only.

Users only see vehicles they own or have been given access to. The owner can
assign another **registered** user to a vehicle by email (Editor/Viewer) and
remove them, on the Vehicles & Roles screen.

Auth endpoints: `POST /api/auth/register`, `POST /api/auth/login`,
`GET /api/auth/me`, `POST /api/auth/logout`. All vehicle, entry, dashboard,
report and reminder endpoints require a valid token.

### Internal validation screen (Phase 9)

There is a hidden, internal-only evaluation page at
`/internal/validation-model`. It is **not** in any navigation and is reachable
only by typing the URL while logged in. It shows NLP/voice metrics (computed
live from the real parser over labelled samples), sample recommendation and
reminder metrics, an honest feasibility checklist (Done / Prototype / Pending),
and user-evaluation placeholders. Data comes from `GET /api/validation`
(protected by login).

## 2. Prerequisites

- **Node.js 18+** (this project was built with Node 22)
- **PostgreSQL** running locally, **or** a free cloud PostgreSQL database
  (for example [Neon](https://neon.tech) or [Supabase](https://supabase.com)).
  You only need the connection string.

---

## 3. Install packages

Install the frontend and backend dependencies separately.

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

---

## 4. Set the DATABASE_URL

The backend reads its configuration from a `.env` file. A template is provided.

```bash
cd backend
cp .env.example .env
```

Then open `backend/.env` and set your PostgreSQL connection string:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE_NAME?schema=public"
PORT=4000
```

Example for a local PostgreSQL install:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mot_uk?schema=public"
```

> **Never commit your real `.env` file.** It is already listed in `.gitignore`.
> Only `.env.example` (with placeholder values) is committed.

The frontend also has a template (`frontend/.env.example`) for the API URL:

```bash
cd frontend
cp .env.example .env
```

```
VITE_API_URL="http://localhost:4000"
```

---

## 5. Run the Prisma migration

This creates the database tables from the schema.

```bash
cd backend
npm run prisma:generate     # generate the Prisma client
npm run prisma:migrate      # create/apply the database tables
```

`prisma:migrate` will ask you to name the first migration — type something
like `init` and press Enter.

> If you just want to check the schema is valid **without** a database, run:
> ```bash
> npm run prisma:validate
> ```

---

## 6. Run the app

Open **two terminals**.

**Terminal 1 — backend:**
```bash
cd backend
npm run dev
```
The API starts on `http://localhost:4000`.
Test the health route in a browser: `http://localhost:4000/api/health`

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev
```
The app starts on `http://localhost:5173` (Vite will print the exact URL).

---

## 7. Useful commands

### Frontend (`/frontend`)
| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type-check the project |

### Backend (`/backend`)
| Command | What it does |
|---|---|
| `npm run dev` | Start the API with auto-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run the compiled server |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:migrate` | Create/apply database migrations |
| `npm run prisma:validate` | Check the schema is valid |
| `npm run prisma:studio` | Open Prisma Studio (visual DB browser) |

---

## 8. Vehicle API (Phase 3)

Base URL: `http://localhost:4000`

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/vehicles` | Create a vehicle |
| `GET` | `/api/vehicles` | List all vehicles |
| `GET` | `/api/vehicles/:id` | Get one vehicle |
| `PUT` | `/api/vehicles/:id` | Update a vehicle |
| `DELETE` | `/api/vehicles/:id` | Delete a vehicle |

### Service / MOT entries (Phase 4)

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/entries` | Create an entry |
| `GET` | `/api/entries` | List all entries |
| `GET` | `/api/entries/:id` | Get one entry |
| `PUT` | `/api/entries/:id` | Update an entry |
| `DELETE` | `/api/entries/:id` | Delete an entry |

- Dates may be typed in several formats (e.g. `12/05/2024`, `12 May 2024`,
  `2024-05-12`) and are stored internally as clean dates (UK day-first).
- The **Recommended Service Date** is auto-derived from the Service Date
  (placeholder rule: +12 months) and updates whenever the Service Date
  changes. The **MOT Due Date** is stored separately and is never replaced
  by the recommended date.
- The Add Entry screen shows the entry form plus the list of saved entries,
  each with View, Edit and Delete.

### Dashboard / Reports / Reminders (Phase 5)

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/dashboard/summary` | Totals, monthly cost, top service types, status counts, top 3 upcoming |
| `GET` | `/api/reports?fromDate=&toDate=` | Entries filtered by date range, with totals |
| `GET` | `/api/reminders` | Recommended-service and MOT-due reminders with status |

### Smart prediction (Phase 6)

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/entries/predict` | Preview the recommended date + explanation before saving |

- The Recommended Service Date is produced by a **rule-based** prediction
  engine (`backend/src/prediction.ts`, mirrored in `frontend/src/lib/prediction.ts`
  for live preview). No machine learning — every adjustment is explainable.
- It starts from a base interval per **Service Type**, then adjusts for
  **fuel type, mileage, vehicle age, brand/model (performance/luxury),
  category (safety-critical), entry type** and the vehicle's **service history**.
- The Add Entry screen shows the recommended date and a short explanation
  (e.g. *"Recommended sooner because this is a diesel vehicle; it has higher
  mileage."*) and recomputes live as you change the vehicle, service date,
  service type or category.
- The prediction only affects the Recommended Service Date — the **MOT Due
  Date is never changed** by it.

### Voice input (Phase 7)

- The Add Entry screen has a **microphone button** (browser Web Speech API).
  Speak an entry like *"Oil change for Ford Focus on 12 May 2024, amount 120
  pounds, status done"* and the form is filled for review.
- Extraction is **rule-based and offline** (`frontend/src/lib/voiceParse.ts`) —
  no AI service or API keys. It recognises vehicle, entry type, service type,
  category, dates, amount, status and notes from the spoken text.
- Nothing is saved automatically: the **transcript is shown**, fields are
  filled, and missing items (e.g. date or amount) are flagged so you can add
  them before pressing **Save**.
- The recommended date recomputes from the voice-filled data, and the **MOT
  Due Date stays separate**.
- If the browser doesn't support speech recognition, a friendly message is
  shown and **manual entry keeps working**.

- The Dashboard uses **bar charts only** (Recharts): monthly cost, most common
  service types, and entries by status, plus summary cards and the top 3
  upcoming services. Friendly empty states show when there is no data.
- Reports accept **From Date** and **To Date** (flexible formats), shown side
  by side, and return the record count and total cost for the range.
- Reminders are rule-based: **Overdue** (past), **Due** (within 30 days),
  **Upcoming** (later). MOT due dates are listed separately from recommended
  services.

Notes:
- Phase 3 uses a **temporary demo user** to own vehicles (full login comes
  later). It is created automatically the first time you add a vehicle.
- The reusable UK vehicle data (brands, models, fuel types, vehicle types)
  lives in `frontend/src/data/ukVehicles.ts`.
- The **Vehicles & Roles** screen lets you add, list, edit and delete vehicles,
  with a searchable brand dropdown and a model dropdown that depends on the
  chosen brand (including "Other Model" for custom entries).

> **Tip:** if `prisma migrate dev` reports a shadow-database permission error,
> grant your database user permission to create databases:
> `ALTER ROLE your_user CREATEDB;`

## 9. Android app (Capacitor)

The frontend is wrapped with [Capacitor](https://capacitorjs.com) so it can be
packaged as an Android app. App name **MOT-UK**, app id **com.motuk.carcare**
(see `frontend/capacitor.config.ts`). The generated `frontend/android/` project
is committed and ready to open in Android Studio.

> **APK build status:** The Android *project* is fully prepared, but an actual
> APK was **not** built in this environment because the **Android SDK is not
> installed** here (Java 21 and Gradle are present, but `ANDROID_HOME` is not
> set). Building/running the APK must be done on your own machine with Android
> Studio. Nothing about success has been faked.

### Build the Android app locally

Prerequisites: **Android Studio** (which installs the Android SDK).

```bash
cd frontend
npm install
npm run cap:sync     # builds the web app and copies it into android/
npm run cap:open     # opens the project in Android Studio
```

Then in Android Studio press **Run** (emulator or a connected device), or use
**Build → Build Bundle(s) / APK(s) → Build APK(s)** to produce an APK.

If you ever delete `frontend/android/`, regenerate it with `npx cap add android`.

### Important: API URL on a real device

On a phone/emulator, `http://localhost:4000` points at the device itself, not
your computer. Before building, set `frontend/.env`:

```
VITE_API_URL="http://<your-computer-LAN-ip>:4000"   # e.g. http://192.168.1.20:4000
```

(or the URL of a hosted backend), then run `npm run cap:sync` again.

## 10. Roadmap (later phases)

- **Phase 3:** Vehicle data + car builder (UK brands, dependent models)
- **Phase 4:** Add / View / Edit / Delete service & MOT entries
- **Phase 5:** Wire screens to the backend + database
- **Phase 6:** Dashboard bar charts, reports, reminders
- **Phase 7:** Smart service prediction (separate from MOT due date)
- **Phase 8:** Voice input (speech → form → preview → save)
- **Phase 9:** Polish + testing
- **Phase 10:** Capacitor Android build
