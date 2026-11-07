# Step-by-Step: Running This in VS Code

This assumes Windows/Mac/Linux with VS Code installed. Estimated time: 15–20 minutes.

---

## 0. Prerequisites (install once)

| Tool | Check version | Install from |
|---|---|---|
| Python 3.11+ | `python --version` | python.org |
| Node.js 20+ | `node --version` | nodejs.org |
| PostgreSQL 14+ | `psql --version` | postgresql.org (or use Docker — see note below) |
| VS Code extensions | — | "Python" (Microsoft) + "ES7+ React" snippets |

**Don't want to install Postgres locally?** Run it in Docker instead:
```bash
docker run --name phd-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=phd_dashboard -p 5432:5432 -d postgres:16
```

---

## 1. Unzip and open the project

Unzip `phd-progress-dashboard.zip`, then in VS Code: **File → Open Folder** →
select the `phd-progress-dashboard` folder. You'll work in two integrated
terminals (**Terminal → New Terminal**) — one for backend, one for frontend.

---

## 2. Backend setup

In **Terminal 1**:

```bash
cd backend
python -m venv venv
```

Activate it:
- **Windows (PowerShell):** `venv\Scripts\Activate.ps1`
- **Mac/Linux:** `source venv/bin/activate`

Then:
```bash
pip install -r requirements.txt
```

In VS Code, press `Ctrl/Cmd+Shift+P` → "Python: Select Interpreter" → pick the
one inside `backend/venv` (this fixes any red squiggly import errors in the
editor).

### 2.1 Configure environment variables

```bash
cp .env.example .env      # Mac/Linux
copy .env.example .env    # Windows
```

Open the new `.env` file and set:
```
SECRET_KEY=<any long random string>
JWT_SECRET_KEY=<a different long random string>
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/phd_dashboard
```
(If you used the Docker command above, that `DATABASE_URL` value is already correct.)

If you don't have Postgres ready yet and just want to click through the UI
today, you can temporarily skip this and the app will fall back to a local
SQLite file — but switch to real Postgres before doing serious development,
since a couple of report/aggregation queries assume Postgres.

### 2.2 Create the database (if you haven't via Docker already)

```bash
# Mac/Linux
createdb phd_dashboard

# Or via psql (any OS)
psql -U postgres -c "CREATE DATABASE phd_dashboard;"
```

### 2.3 Run migrations

```bash
flask db init
flask db migrate -m "Initial schema"
flask db upgrade
```

This creates all 18 tables in your Postgres database.

### 2.4 Seed demo data

```bash
python seed.py
```

You should see: `Seed complete: 50 students created (30 PhD, 20 Master's).`
along with 4 demo login credentials — keep those visible, you'll need them.

### 2.5 Start the backend

```bash
python run.py
```

Leave this running. Visit `http://localhost:5000/api/health` in a browser —
you should see `{"status": "ok"}`. That confirms the backend is alive.

---

## 3. Frontend setup

In **Terminal 2** (keep Terminal 1's server running):

```bash
cd frontend
npm install
cp .env.example .env      # Mac/Linux
copy .env.example .env    # Windows
```

The default `.env` (`VITE_API_BASE_URL=http://localhost:5000/api`) already
points at your local backend — no changes needed unless you deploy it
elsewhere later.

```bash
npm run dev
```

Open the printed URL (usually `http://localhost:5173`). Log in with any of
the demo accounts shown on the login screen.

---

## 4. What to check first

1. **Login** with `admin@university.edu` / `Admin@123`.
2. **Dashboard** should show KPI cards (50 total students, etc.) and 6 charts.
3. **Student Directory** — try the search box, click a column header to sort,
   click a row to open that student's profile.
4. **Filter bar** — pick a department or program; the KPIs, charts, and table
   should all update together (they share one filter state).
5. Log out and back in as `supervisor@university.edu` / `Super@123` — notice
   the sidebar changes (role-based navigation).

If any of this doesn't work, check both terminal windows for errors first —
90% of setup issues are either (a) Postgres not running/reachable, or
(b) the frontend `.env` pointing at the wrong backend URL.

---

## 5. Building the remaining phases (4–8)

The sidebar already links to these pages; each currently shows a "Coming
Soon" placeholder. The backend routes for most of them already exist — you're
wiring up frontend pages, not building new APIs from scratch. Do them **one
phase at a time** (as recommended), following the exact pattern already used
in `DashboardPage.tsx` and `StudentDirectoryPage.tsx`:

1. Read the relevant backend route file in `backend/app/routes/` to see the
   exact response shape.
2. Add matching TypeScript types to `frontend/src/types/index.ts`.
3. Add a typed function to `frontend/src/api/endpoints.ts`.
4. Build the page in `frontend/src/pages/`, using `useQuery` from
   `@tanstack/react-query` the same way the existing pages do.
5. Swap the `<ComingSoonPage ... />` for your new page in `frontend/src/App.tsx`.

Suggested order (matches your original phase plan):

| Phase | Module | Backend route file |
|---|---|---|
| 4 | Research Milestones | `app/routes/milestones.py` (or wherever milestones live in `students.py`) |
| 5 | Publications & Submissions detail views | `app/routes/publications.py`, `app/routes/submissions.py` |
| 5 | Supervisor Dashboard | filter students by `supervisor_id` on existing `/students` and `/dashboard` endpoints |
| 6 | Department Analytics | likely needs a new aggregation route — check `app/routes/dashboard.py` for what exists, extend if needed |
| 7 | Reports & Exports | `app/routes/reports.py` — already returns CSV/XLSX/PDF; just needs a frontend "Export" button using `downloadReport()` in `api/endpoints.ts` |
| 7 | Notifications | `app/routes/notifications.py` (if present) or add one |
| 8 | Settings / User Management | admin-only CRUD on `users` — new route + page |

---

## 6. Common issues

| Symptom | Likely cause / fix |
|---|---|
| `ModuleNotFoundError` in Python | venv not activated, or `pip install -r requirements.txt` not run inside it |
| Frontend shows blank page, console shows CORS error | Backend `.env` `CORS_ORIGINS` / `FRONTEND_ORIGIN` doesn't match `http://localhost:5173` |
| Login fails with network error | Backend isn't running, or `VITE_API_BASE_URL` in frontend `.env` is wrong |
| `flask db init` says migrations folder exists | Delete the empty `backend/migrations` folder and retry |
| Charts/tables show "No data" | Seed script wasn't run, or filters are too narrow — click "Reset Filters" |
| Port 5000 or 5173 already in use | Another process is using it — stop it, or change the port in `run.py` / `vite.config.ts` |

---

## 7. Before you deploy anywhere real

- Generate strong random values for `SECRET_KEY` and `JWT_SECRET_KEY` (don't
  reuse anything from `.env.example`).
- Never commit your real `.env` file (already covered by `.gitignore`).
- Switch Flask's dev server for a production WSGI server (`gunicorn` is
  already in `requirements.txt`).
- Build the frontend for production with `npm run build` and serve the
  `dist/` folder from a static host or behind the same reverse proxy as the API.
