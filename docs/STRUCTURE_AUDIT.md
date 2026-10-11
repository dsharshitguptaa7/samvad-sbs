# SAMVAD — Complete Project Structure & Migration Audit

**Date:** 2026-10-11  
**Branch:** `migrate-fastapi-backend`  
**Target Architecture:** Next.js 14 Frontend (Vercel) + FastAPI Python Backend (Render) + Neon PostgreSQL  

---

## 1. Executive Summary

This audit validates the separation of responsibilities between the Next.js frontend and the FastAPI backend. It inventories all code assets, identifies duplicate business logic, traces environment configurations, and specifies corrective actions required before deployment.

---

## 2. Full Repository Inventory

### A. Frontend-Exclusive Assets (`src/`)
* **Next.js 14 App Router Views:**
  * Public / Auth Pages:
    * `src/app/page.tsx` — Portal Landing Page with CSJMU branding & role access links.
    * `src/app/login/page.tsx` — Centralized multi-role login interface.
    * `src/app/register/page.tsx` — Student registration interface with dynamic department loading.
    * `src/app/reset-password/page.tsx` — Password reset token handler and form.
    * `src/app/track/page.tsx` — Public grievance tracking portal with timeline view.
  * Role-Protected Dashboards:
    * `src/app/student/page.tsx` — Student dashboard & active grievance tracker.
    * `src/app/coordinator/page.tsx` — Tier-1 Course Coordinator adjudication console.
    * `src/app/department-head/page.tsx` — Tier-2 Department Head (HOD) review & escalation console.
    * `src/app/director/page.tsx` — Tier-3 Director institution-wide grievance console.
    * `src/app/admin/page.tsx` — System Administration portal (Master Data, Staff, Workflow Config).
* **React Components (`src/components/`):**
  * Core UI: `Navbar.tsx`, `Footer.tsx`
  * Admin Modules: `AssignmentManager.tsx`, `CourseManager.tsx`, `DepartmentManager.tsx`, `RoutingMatrixViewer.tsx`, `StaffManager.tsx`, `WorkflowConfigManager.tsx`.
  * Staff Workflows: `CoordinatorWorkflowModal.tsx`, `HodWorkflowModal.tsx`, `DirectorWorkflowModal.tsx`.
  * Student Forms: `GrievanceLodgingForm.tsx`, `GrievanceDetailModal.tsx`.
* **Frontend Utilities & Client:**
  * `src/lib/api-client.ts` — Centralized typed API client configured for FastAPI cross-origin requests.
  * `src/lib/utils.ts` — Tailwind merge and styling utilities.

### B. FastAPI Backend Assets (`backend/`)
* **Core Runtime & Configuration (`backend/app/core/`):**
  * `config.py` — Settings loading environment variables, auto-detecting Render persistent disk `/var/data`, and CORS origins.
  * `database.py` — SQLAlchemy 2.0 engine and session factory with Psycopg 3 connecting to Neon PostgreSQL.
  * `security.py` — Bcrypt password hashing (12 rounds), 256-bit cryptographically secure session token generation, SHA-256 token hashing, session creation & verification.
  * `deps.py` — FastAPI dependency injection: active session verification (`get_current_user`) and RBAC enforcement (`require_role`).
* **Data Models & Schemas (`backend/app/models/`, `backend/app/schemas/`):**
  * `models/entities.py` — SQLAlchemy declarative models mapped 1-to-1 to Prisma database tables: `User`, `Session`, `Department`, `Course`, `StaffAssignment`, `Grievance`, `GrievanceDocument`, `DocumentRequest`, `GrievanceTimelineAction`, `WorkflowConfiguration`, `WorkflowAuditLog`.
  * `schemas/all_schemas.py` — Strict Pydantic v2 schemas for all requests, responses, and workflow payloads.
* **Domain Services (`backend/app/services/`):**
  * `routing.py` — Authority chain resolution engine (`resolve_authority_chain`), supporting `HOD_DIRECTOR` and `COORDINATOR_HOD_DIRECTOR` workflow modes.
  * `storage.py` — Private evidentiary document storage service (`StorageService`) with magic bytes validation (PDF, WebP, PNG, JPEG), 5MB size limit, UUID keying, SHA-256 calculation, and startup health verification (`verify_storage_health`).
* **API Routers (`backend/app/routers/`):**
  * `auth.py` — `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/reset-password`.
  * `departments.py` — `/api/departments` (public listing for student registration).
  * `track.py` — `/api/track` (public tracking by trackingNumber).
  * `student.py` — `/api/student/grievances` (list & multipart submission), `/api/student/grievances/{id}`, `/api/student/grievances/{id}/requests/{requestId}/respond`.
  * `documents.py` — `/api/documents/{id}` and `/api/documents/{id}/download` (authenticated private file streaming).
  * `coordinator.py` — `/api/coordinator/grievances`, `/api/coordinator/grievances/{id}` (Tier-1 action handler).
  * `department_head.py` — `/api/department-head/grievances`, `/api/department-head/grievances/{id}` (Tier-2 action handler).
  * `director.py` — `/api/director/grievances`, `/api/director/grievances/{id}` (Tier-3 action handler).
  * `admin.py` — `/api/admin/workflow`, `/api/admin/routing`, `/api/admin/departments`, `/api/admin/courses`, `/api/admin/staff`, `/api/admin/assignments`.
* **Testing Suite (`backend/tests/`):**
  * `test_basic_parity.py` — Baseline unauthenticated & health endpoint verification.
  * `test_full_workflow_parity.py` — End-to-end integration test (admin login, student registration, session validation, RBAC checks, grievance submission, HOD resolution).
  * `test_document_storage_parity.py` — Magic bytes validation, 5MB ceiling, real file upload, Neon DB metadata persistence, owner download, non-owner 403 rejection, admin 403 rejection, and backend restart persistence.

---

## 3. Boundary & Duplication Analysis

### A. Next.js API Routes (`src/app/api/`)
* **Current State:** 19 API route files exist from the monolithic architecture.
* **Routing Precedence:** In `next.config.mjs`, `beforeFiles` rewrites ensure that all incoming `/api/:path*` requests are forwarded to `${FASTAPI_URL}/api/:path*` **before** Next.js filesystem route handlers are checked.
* **Proxy Safety Fallback:** Even if a request bypasses the rewrite and hits `src/app/api/student/grievances/route.ts` or `src/app/api/documents/[id]/route.ts`, those handlers now forward directly to FastAPI rather than executing on Vercel's serverless filesystem.
* **Recommendation:** Keep root-level Next.js structure. Retaining existing Next.js routes with `beforeFiles` rewrites provides a zero-risk setup: production traffic reaches FastAPI seamlessly, while standalone Node tests in `tests/` continue to function without disruption.

### B. Authentication & Session Parity
* Both Node and Python implementations use:
  * Passwords: standard bcrypt with 12 rounds.
  * Session Tokens: 256-bit cryptographically secure hex strings.
  * Database Hash: SHA-256 of raw session token stored in `Session.token`.
  * Cookie: `samvad_session` (HttpOnly, SameSite, Secure).
* Sessions created by FastAPI are valid across both systems; sessions created in the database are verified with identical logic.

### C. Database Schema Ownership
* **Owner:** Prisma (`prisma/schema.prisma` and `prisma/migrations/`) remains the authoritative schema owner.
* **Alembic Role:** `backend/alembic/` is configured solely for SQLAlchemy metadata validation and reflection against the existing database. Alembic must **not** execute independent schema modifications.

---

## 4. Audit of Storage & Environment References

| Reference | File Location(s) | Status / Context |
|---|---|---|
| `.storage/grievances` | `backend/app/core/config.py`, `src/lib/storage/provider.ts` | Local development fallback only. Writable `/var/data` is used in production. |
| `/var/task` | None | No hardcoded references exist. |
| `STORAGE_LOCAL_DIR` | `backend/app/core/config.py`, `src/lib/storage/provider.ts`, `docs/DEPLOYMENT_GUIDE.md` | Defaults to `/var/data/samvad/storage/grievances` on Render. |
| `FASTAPI_URL` | `next.config.mjs`, `src/app/api/...`, `docs/DEPLOYMENT_GUIDE.md` | Used by Next.js rewrites and proxy handlers to reach Render FastAPI. |
| `NEXT_PUBLIC_API_URL` | `next.config.mjs`, `src/lib/api-client.ts`, `docs/DEPLOYMENT_GUIDE.md` | Client browser base URL fallback. |

---

## 5. Defects & Missing Files Identified

1. **Missing Python Package Files (`__init__.py`):**
   * `backend/__init__.py` — Missing.
   * `backend/app/__init__.py` — Missing.
   * `backend/app/core/__init__.py` — Missing.
   * `backend/app/routers/__init__.py` — Missing.
   * `backend/app/services/__init__.py` — Missing.
   * `backend/app/schemas/__init__.py` — Missing.
   *(Result: Python imports fail when invoked outside project root).*

2. **Tracked Python Bytecode (`.pyc`) in Git:**
   * 22 `.pyc` files in `backend/app/**/__pycache__/` and `backend/tests/**/__pycache__/` are tracked in Git index.
   * `.gitignore` lacks entries for `__pycache__/`, `*.pyc`, `.storage/`, and `.pytest_cache/`.

3. **Deployment Guide Startup Command:**
   * `docs/DEPLOYMENT_GUIDE.md` instructed `cd backend && uvicorn backend.app.main:app`, which causes `ModuleNotFoundError: No module named 'backend'`.
   * Correction: Run from repository root as `uvicorn backend.app.main:app` or set `PYTHONPATH=.`.

4. **Git Tracking of Core Backend Assets:**
   * `backend/requirements.txt`: Confirmed tracked in Git.
   * `backend/app/main.py`: Confirmed tracked in Git.

---

## 6. Action Plan Before Deployment

1. Create all missing `__init__.py` files in `backend/`.
2. Update `.gitignore` to include `__pycache__/`, `*.pyc`, `*.pyo`, `.storage/`, `.pytest_cache/`, `.venv/`, and `venv/`.
3. Remove tracked `.pyc` files from the Git index (`git rm --cached`).
4. Correct startup and path instructions in `docs/DEPLOYMENT_GUIDE.md`.
5. Run full test suites: `pytest backend/tests`, `npm run typecheck`, `npm run lint`, and `npm run build`.
