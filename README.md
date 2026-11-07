# PhD & Research Progress Dashboard

A comprehensive academic research progress tracking dashboard and DBMS showcase for PhD and Master's students — built as a full-stack application: **Flask + PostgreSQL (Neon Cloud)** backend and **React 19 + TypeScript + Vite + Tailwind CSS** frontend.

Deploys seamlessly to **Vercel** with full-stack serverless Python backend (`/api/index.py`) and Vite SPA routing.

---

## Live DBMS Concepts Showcase
The system demonstrates 4 core Database Management System (DBMS) architectural concepts with live in-browser labs and real PostgreSQL database engine integration:

1. **Relational Schema Normalization (1NF, 2NF, 3NF, BCNF)**:
   - 24 normalized tables eliminating transitive/partial dependencies and insertion/update/deletion anomalies.
   - Decomposed multi-author publications (`publication_authors`), billing line items (`invoice_items`), 3NF fee catalogs (`fee_catalog`), and 1:1 financial ledgers (`student_fee_accounts`).
2. **Database Triggers for Immutable Audit Logs**:
   - Native PostgreSQL PL/pgSQL trigger function (`fn_audit_log_trigger()`) monitoring `students`, `submissions`, `research_milestones`, `invoices`, and `billing_transactions`.
   - Fires kernel-level `AFTER INSERT OR UPDATE OR DELETE` events and serializes `OLD` and `NEW` records into JSON audit streams.
3. **Role-Based SQL Views (RBAC & Column-Level Confidentiality)**:
   - Four dedicated SQL views (`view_student_role_access`, `view_supervisor_role_access`, `view_admin_role_access`, `view_billing_role_access`).
   - Restricts data visibility by actor role and protects confidential research notes and financial records.
4. **ACID Transactions for Billing & Fee Settlement**:
   - ACID transaction pipeline with row-level pessimistic locking (`SELECT ... FOR UPDATE`).
   - Guarantees Atomicity across invoice updates, fee ledger adjustments, and audit ledger entries.
   - Includes an interactive transaction failure and rollback simulator.

---

## Credentials for Demo
- **Administrator**: `admin@university.edu` / `Admin@123`
- **Supervisor**: `supervisor@university.edu` / `Super@123`
- **Student**: `student@university.edu` / `Student@123`

---

## Local Development Setup

### 1. Backend (Flask + PostgreSQL)
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python seed.py       # Seeds 50 students, billing accounts, triggers & views
python run.py        # Starts Flask server on http://localhost:5000
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev          # Starts Vite dev server on http://localhost:5173
```

---

## Vercel Deployment

This project is pre-configured with `vercel.json` and `api/index.py` for full-stack deployment on Vercel:
- **Frontend**: Built via `buildCommand` and served from `frontend/dist`.
- **Backend**: Executed as a Python Serverless Function via `@vercel/python` routing all `/api/*` traffic to `api/index.py`.
- **Database**: Connects directly to Neon Cloud PostgreSQL over SSL.

Environment Variables on Vercel:
- `DATABASE_URL`: Your PostgreSQL connection string (defaults to cloud Neon DB).
- `SECRET_KEY`: Random 32+ character string.
- `JWT_SECRET_KEY`: Random 32+ character string.
- `FRONTEND_ORIGIN`: `*` (or your Vercel deployment URL).

│   │   ├── routes/       # Flask blueprints
│   │   ├── services/     # risk engine, progress calculator, reports
│   │   ├── schemas/      # marshmallow (de)serialization
│   │   └── utils/        # decorators, filters, pagination
│   ├── config.py
│   ├── run.py
│   ├── seed.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api/          # axios client + typed endpoint functions
    │   ├── context/      # auth + global filter state
    │   ├── components/   # layout, charts, ui primitives
    │   ├── pages/
    │   └── types/
    └── package.json
```

## Demo logins (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@university.edu | Admin@123 |
| Coordinator | coordinator@university.edu | Coord@123 |
| Supervisor | supervisor@university.edu | Super@123 |
| Student | student@university.edu | Student@123 |
