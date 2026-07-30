# PeoplePulse HRMS — Phase 1

Full-stack HRMS starter with **Dashboard** + **Employee Management** (Zoho People + Odoo level fields).

## Stack
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + React Hook Form + Zod + TanStack Table + Recharts
- **Backend:** FastAPI + SQLAlchemy 2 + Alembic + Pydantic v2
- **DB:** PostgreSQL 16
- **Auth:** JWT (HS256), bcrypt
- **Container:** docker-compose

## Quick Start

### Option A — Docker (recommended)
```bash
docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000/docs
# Postgres: localhost:5432  (user: hrms / pass: hrms / db: hrms)
```

### Option B — Local dev

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # edit DB url if needed
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Default Login
- Email: `admin@peoplepulse.io`
- Password: `Admin@123`

A seed script runs on first backend boot (creates company, admin user, departments, designations, 10 demo employees).

## Project Structure
```
hrms-app/
├── frontend/                Next.js 15 app
│   ├── app/
│   │   ├── (dashboard)/     Authenticated layout
│   │   │   ├── page.tsx     Dashboard
│   │   │   ├── employees/
│   │   │   │   ├── page.tsx           List
│   │   │   │   └── new/page.tsx       Multi-tab create form
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── components/          Sidebar, Topbar, ui/*
│   └── lib/                 api client, auth, utils
├── backend/
│   └── app/
│       ├── main.py
│       ├── database.py
│       ├── models/          SQLAlchemy models
│       ├── schemas/         Pydantic schemas
│       ├── routers/         FastAPI routes
│       ├── core/            config, security
│       └── seed.py
└── docker-compose.yml
```

## Employee Form Fields (Zoho People + Odoo merged)

7 tabs in the create form — see `frontend/app/(dashboard)/employees/new/page.tsx`:

1. **Personal** — emp_id, prefix, first/middle/last, display name, gender, DOB, blood group, marital status, nationality, photo
2. **Contact** — work email, personal email, mobile, alt phone, present + permanent address (same-as toggle)
3. **Job** — department, designation, employee type, DOJ, probation end, reporting manager, work location, shift, source of hire, tags, status
4. **Compensation & Statutory** — CTC, pay frequency, bank (name/acct/IFSC/branch/type), PAN, Aadhaar, UAN, PF, ESI
5. **Education** — multiple rows (institute, degree, specialization, year from/to, grade)
6. **Experience & Family** — past employment + dependents + emergency contact
7. **Documents** — Aadhaar / PAN / Passport / Resume / Offer Letter / Certificates upload

## License
MIT
