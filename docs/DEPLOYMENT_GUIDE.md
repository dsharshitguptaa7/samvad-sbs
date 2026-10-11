# SAMVAD Deployment & Migration Runbook
**Architecture:** Next.js 14 Frontend + FastAPI (Python 3.10+) Backend + Neon PostgreSQL

---

## 1. Environment Variable Templates (No Secrets)

### Backend Environment Configuration (`backend/.env` or Host Environment)
```env
# Database connection string to Neon PostgreSQL
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require

# 64-character cryptographically random secret string for session signing
SESSION_SECRET=REPLACE_WITH_A_64_CHARACTER_CRYPTOGRAPHICALLY_RANDOM_SECRET_STRING

# Environment & Server Config
ENVIRONMENT=production
PORT=8000

# Exact origin of the deployed frontend (NEVER use wildcard *)
FRONTEND_ORIGIN=https://samvad.csjmu.ac.in

# Private storage directory for uploaded evidence
STORAGE_LOCAL_DIR=/var/data/samvad/storage/grievances
```

### Frontend Environment Configuration (`.env.production` / Vercel Settings)
```env
# URL to FastAPI Backend (Server-Side Next.js reverse proxy & rewrites)
FASTAPI_URL=https://api-samvad.csjmu.ac.in

# Public URL accessible from client browser
NEXT_PUBLIC_API_URL=https://api-samvad.csjmu.ac.in

# Node Environment
NODE_ENV=production
```

---

## 2. Backend Deployment Instructions

### System Prerequisites
- Python 3.10+ (tested on Python 3.14)
- PostgreSQL client libraries

### Installation & Execution
```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
pip install -r requirements.txt

# 3. Health & Database connectivity check
python -c "from backend.app.core.database import SessionLocal; from sqlalchemy import text; db = SessionLocal(); print('Connected to DB:', db.execute(text('SELECT 1')).scalar()); db.close()"

# 4. Start production server with Uvicorn (multi-worker)
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Health Check Endpoint
- **URL**: `GET /health`
- **Expected Response**: `{"status": "healthy", "service": "SAMVAD FastAPI Backend", ...}`

---

## 3. Frontend Deployment Instructions (Vercel / Node.js)

```bash
# 1. Install dependencies
npm ci

# 2. Run TypeScript and Lint verification
npm run typecheck
npm run lint

# 3. Build Next.js bundle
npm run build

# 4. Start production Node server
npm start
```

---

## 4. Rollback & Fail-Safe Strategy

1. **Git Branch Isolation**:
   - The entire FastAPI backend and migration code resides on git branch `migrate-fastapi-backend`.
   - The original Next.js monolithic backend remains fully intact on branch `master`.
2. **Database Non-Destructiveness**:
   - The FastAPI backend uses the existing Neon PostgreSQL database and schema without modifying existing tables, constraints, or rows.
   - If a rollback is needed at any point, checkout `master` and redeploy Next.js.
