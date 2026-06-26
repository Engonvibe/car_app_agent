# Deployment guide (beginner-friendly)

This guide hosts the app for free so you can demo it from any device:

1. **PostgreSQL database** — Neon (free)
2. **Backend API** — Render (free web service)
3. **Frontend** — Netlify (or Vercel) (free static hosting)

You can swap any provider; the steps are similar. Total time ≈ 30–45 minutes.

> Order matters: **database → backend → frontend**, because each needs the URL
> of the previous one.

---

## 1. PostgreSQL database (Neon)

1. Sign up at <https://neon.tech> and create a project.
2. Copy the **connection string** (it looks like
   `postgresql://USER:PASSWORD@HOST/db?sslmode=require`).
3. Keep it safe — this is your `DATABASE_URL`.

---

## 2. Backend API (Render)

1. Push your repo to GitHub (already done on your branch).
2. On <https://render.com> → **New → Web Service** → connect the repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run prisma:generate && npm run build`
   - **Start Command:** `npm run start`
   - **Environment:** Node
4. Add **Environment Variables**:
   - `DATABASE_URL` = your Neon string
   - `AUTH_SECRET` = a long random string (e.g. from `openssl rand -hex 32`)
   - `PORT` = `4000` (Render also sets its own `PORT`; the app reads it)
5. Deploy. Once live, note the URL, e.g. `https://mot-uk-api.onrender.com`.

### Run the migration + seed once (against the hosted DB)

From your computer, with the production `DATABASE_URL` in `backend/.env`:

```bash
cd backend
npm install
npm run prisma:migrate    # creates the tables in the hosted database
npm run seed              # optional: demo Owner/Editor/Viewer accounts
```

(Alternatively use Render's **Shell** tab and run the same commands there.)

> CORS: the backend currently allows all origins (`app.use(cors())`), which is
> fine for a project demo. To lock it down later, restrict it to your frontend
> URL.

---

## 3. Frontend (Netlify)

1. On <https://netlify.com> → **Add new site → Import from Git** → pick the repo.
2. Settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
3. Add **Environment variable**:
   - `VITE_API_URL` = your Render backend URL (e.g. `https://mot-uk-api.onrender.com`)
4. Deploy. You'll get a URL like `https://mot-uk.netlify.app`.

### SPA routing fix (so refresh on a route doesn't 404)

Create `frontend/public/_redirects` containing:

```
/*    /index.html   200
```

(Netlify serves this so client-side routes like `/dashboard` work on refresh.)
On Vercel, add a `vercel.json` with a catch-all rewrite to `/index.html` instead.

---

## 4. Try it

Open the frontend URL, log in with a seeded demo account
(`demo@motcare.local` / `password123`), and confirm vehicles, entries,
dashboard, reports and reminders all load.

---

## 5. Common issues

| Symptom | Fix |
|---|---|
| Frontend loads but every request fails | `VITE_API_URL` wrong/missing — set it and redeploy |
| 401 on every call | Expected when logged out; log in. If always 401, check `AUTH_SECRET` is set on the backend |
| Login works but data is empty | Run `npm run seed`, or add data as the logged-in user |
| `P1001 can't reach database` | `DATABASE_URL` wrong, or missing `?sslmode=require` for Neon |
| Refreshing `/dashboard` gives 404 | Add the SPA redirect (step 3) |
| First request is very slow | Free tiers sleep when idle; the first hit wakes them |

---

## 6. Security notes (for the write-up)

- Never commit real secrets — only `.env.example` is in git.
- Rotate `AUTH_SECRET` if it ever leaks (invalidates existing tokens).
- For production you'd add: restricted CORS, httpOnly cookie tokens, rate
  limiting, and HTTPS-only (the hosts above provide HTTPS automatically).
