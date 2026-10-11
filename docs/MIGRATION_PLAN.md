# SAMVAD Backend Migration Plan & Endpoint Inventory
**Target Architecture:** FastAPI + SQLAlchemy 2.0 (psycopg 3) + Pydantic v2 + Alembic (Targeting existing Neon PostgreSQL database)  
**Frontend:** Next.js 14 (App Router) with Centralized Typed API Client

---

## 1. Single Database Schema Authority Strategy
- **Current Authority:** Prisma manages migrations under `prisma/migrations` on Neon PostgreSQL.
- **Migration Strategy:** The existing Neon schema (tables, constraints, enums, indexes) is preserved 100% without re-creating or resetting tables.
- **Single Owner Rule:**
  - During the migration and testing phase, Prisma retains ownership of the existing schema migrations (Alembic is configured with a baseline matching current Prisma state, without issuing DDL changes).
  - Once the FastAPI cutover is complete and Next.js backend routes are retired, Alembic will become the single owner for future schema changes via `backend/alembic/`.

---

## 2. Exhaustive API Route Mapping & Inventory

| # | Existing Next.js API Route | HTTP Method | Auth Role / Guard | Proposed FastAPI Route | Target FastAPI Router Module | Responsibility |
|---|----------------------------|-------------|-------------------|------------------------|------------------------------|----------------|
| 1 | `/api/auth/register` | `POST` | Public | `/api/auth/register` | `backend/routers/auth.py` | Student self-registration with roll/enrollment number, duplicate check, bcrypt hash, session creation |
| 2 | `/api/auth/login` | `POST` | Public | `/api/auth/login` | `backend/routers/auth.py` | Multi-role credential check (email/roll/enrollment), rate limiting, bcrypt verify, session creation |
| 3 | `/api/auth/logout` | `POST` | Authenticated | `/api/auth/logout` | `backend/routers/auth.py` | Invalidate DB session, clear `samvad_session` cookie |
| 4 | `/api/auth/me` | `GET` | Authenticated | `/api/auth/me` | `backend/routers/auth.py` | Return authenticated user details, permissions, role |
| 5 | `/api/auth/reset-password` | `POST` | Authenticated (forced reset) / Token | `/api/auth/reset-password` | `backend/routers/auth.py` | Staff forced password change or token-based reset |
| 6 | `/api/departments` | `GET` | Public | `/api/departments` | `backend/routers/departments.py` | List active departments and active courses for registration/landing dropdowns |
| 7 | `/api/track` | `GET` | Public | `/api/track` | `backend/routers/track.py` | Anonymous tracking of grievance status by tracking number (student-visible timeline only) |
| 8 | `/api/student/grievances` | `GET` | `STUDENT` | `/api/student/grievances` | `backend/routers/student.py` | List logged grievances owned by authenticated student |
| 9 | `/api/student/grievances` | `POST` | `STUDENT` | `/api/student/grievances` | `backend/routers/student.py` | Submit grievance, resolve authority chain (HOD_DIRECTOR vs COORDINATOR), upload initial documents, record timeline |
| 10 | `/api/student/grievances/[id]` | `GET` | `STUDENT` (Owner) | `/api/student/grievances/{id}` | `backend/routers/student.py` | Grievance details, document list, pending requests, public timeline actions |
| 11 | `/api/student/grievances/[id]` | `POST` | `STUDENT` (Owner) | `/api/student/grievances/{id}/documents` | `backend/routers/student.py` | Fulfill staff document request with uploaded evidence |
| 12 | `/api/coordinator/grievances` | `GET` | `COURSE_COORDINATOR` | `/api/coordinator/grievances` | `backend/routers/coordinator.py` | List grievances assigned to coordinator's assigned courses/semesters |
| 13 | `/api/coordinator/grievances/[id]` | `GET` | `COURSE_COORDINATOR` | `/api/coordinator/grievances/{id}` | `backend/routers/coordinator.py` | View coordinator grievance details, internal remarks, document requests |
| 14 | `/api/coordinator/grievances/[id]` | `PATCH` | `COURSE_COORDINATOR` | `/api/coordinator/grievances/{id}` | `backend/routers/coordinator.py` | Coordinator actions: MARK_UNDER_REVIEW, ADD_INTERNAL_REMARK, REQUEST_DOCUMENTS, FORWARD_TO_HOD, RESOLVE |
| 15 | `/api/department-head/grievances` | `GET` | `DEPARTMENT_HEAD` | `/api/department-head/grievances` | `backend/routers/department_head.py` | List grievances for HoD's assigned department |
| 16 | `/api/department-head/grievances/[id]` | `GET` | `DEPARTMENT_HEAD` | `/api/department-head/grievances/{id}` | `backend/routers/department_head.py` | View HoD grievance details, confidential notes, document requests |
| 17 | `/api/department-head/grievances/[id]` | `PATCH` | `DEPARTMENT_HEAD` | `/api/department-head/grievances/{id}` | `backend/routers/department_head.py` | HoD actions: MARK_UNDER_REVIEW, ADD_INTERNAL_REMARK, REQUEST_DOCUMENTS, FORWARD_TO_DIRECTOR, RESOLVE |
| 18 | `/api/director/grievances` | `GET` | `DIRECTOR` | `/api/director/grievances` | `backend/routers/director.py` | List school-wide escalated grievances (Tier 3) or overview |
| 19 | `/api/director/grievances/[id]` | `GET` | `DIRECTOR` | `/api/director/grievances/{id}` | `backend/routers/director.py` | View Director grievance details, complete timeline, internal handover notes |
| 20 | `/api/director/grievances/[id]` | `PATCH` | `DIRECTOR` | `/api/director/grievances/{id}` | `backend/routers/director.py` | Director actions: MARK_UNDER_REVIEW, ADD_INTERNAL_REMARK, REQUEST_DOCUMENTS, RESOLVE, DISMISS |
| 21 | `/api/documents/[id]` | `GET` | Role & Ownership Validated | `/api/documents/{id}` | `backend/routers/documents.py` | Stream grievance evidentiary file. Direct student owner or assigned staff only; System Admin forbidden |
| 22 | `/api/admin/staff` | `GET` | `SYSTEM_ADMIN` | `/api/admin/staff` | `backend/routers/admin_staff.py` | List staff accounts with assignment status |
| 23 | `/api/admin/staff` | `POST` | `SYSTEM_ADMIN` | `/api/admin/staff` | `backend/routers/admin_staff.py` | Provision new staff member, force password reset, log audit |
| 24 | `/api/admin/staff/[id]` | `PATCH` | `SYSTEM_ADMIN` | `/api/admin/staff/{id}` | `backend/routers/admin_staff.py` | Update staff details, toggle active/inactive, revoke sessions on deactivation |
| 25 | `/api/admin/departments` | `GET` | `SYSTEM_ADMIN` | `/api/admin/departments` | `backend/routers/admin_departments.py` | List departments with course counts and assignment metrics |
| 26 | `/api/admin/departments` | `POST` | `SYSTEM_ADMIN` | `/api/admin/departments` | `backend/routers/admin_departments.py` | Create department, log audit |
| 27 | `/api/admin/departments/[id]` | `PATCH` | `SYSTEM_ADMIN` | `/api/admin/departments/{id}` | `backend/routers/admin_departments.py` | Update department details or toggle active status |
| 28 | `/api/admin/courses` | `GET` | `SYSTEM_ADMIN` | `/api/admin/courses` | `backend/routers/admin_courses.py` | List courses with department info and coordinator assignments |
| 29 | `/api/admin/courses` | `POST` | `SYSTEM_ADMIN` | `/api/admin/courses` | `backend/routers/admin_courses.py` | Create course under department, log audit |
| 30 | `/api/admin/courses/[id]` | `PATCH` | `SYSTEM_ADMIN` | `/api/admin/courses/{id}` | `backend/routers/admin_courses.py` | Update course name, code, total semesters, or toggle active status |
| 31 | `/api/admin/assignments` | `GET` | `SYSTEM_ADMIN` | `/api/admin/assignments` | `backend/routers/admin_assignments.py` | List active and historical staff authority assignments |
| 32 | `/api/admin/assignments` | `POST` | `SYSTEM_ADMIN` | `/api/admin/assignments` | `backend/routers/admin_assignments.py` | Assign staff to HoD or Course Coordinator (with semester matrix) |
| 33 | `/api/admin/assignments/[id]` | `DELETE` | `SYSTEM_ADMIN` | `/api/admin/assignments/{id}` | `backend/routers/admin_assignments.py` | Soft-deactivate staff assignment (`isActive=False, unassignedAt=now()`), log audit |
| 34 | `/api/admin/routing` | `GET` | `SYSTEM_ADMIN` | `/api/admin/routing` | `backend/routers/admin_routing.py` | Authority matrix resolver and validation report (course-level or school-level) |
| 35 | `/api/admin/workflow` | `GET` | `SYSTEM_ADMIN` | `/api/admin/workflow` | `backend/routers/admin_workflow.py` | Active workflow mode (`HOD_DIRECTOR` vs `COORDINATOR_HOD_DIRECTOR`), readiness analysis, audit history |
| 36 | `/api/admin/workflow` | `POST` | `SYSTEM_ADMIN` | `/api/admin/workflow` | `backend/routers/admin_workflow.py` | Change workflow mode with optimistic concurrency control, prerequisite readiness check, and immutable audit log |

---

## 3. Frontend Dependencies on Server-Side Next.js Code
1. **Server Components:**
   - `src/app/page.tsx` directly queries `prisma.department.findMany` for active landing page data and `getSessionUser()`.
   - `src/app/student/page.tsx` calls `prisma.grievance.findMany` to pre-seed the student dashboard.
   - `src/app/coordinator/page.tsx`, `src/app/department-head/page.tsx`, `src/app/director/page.tsx` call `prisma` for initial dashboard counts.
   - `src/app/admin/page.tsx` calls `getSessionUser()`.
   - `src/app/login/page.tsx` checks `getSessionUser()` for redirection.
2. **Strategy for Frontend Migration:**
   - Implement typed API client in `src/lib/api-client.ts` pointing to `NEXT_PUBLIC_API_URL` (defaulting to `http://localhost:8000` or server-side internal URL).
   - In Next.js Server Components, fetch from FastAPI backend or client components fetch via API client with credentials.
   - Keep page routes (`/login`, `/register`, `/student`, `/coordinator`, `/department-head`, `/director`, `/admin`, `/track`) unchanged so end-user URLs and navigation remain identical.

---

## 4. Session, Cookies, and CORS Security Architecture
- **Session Mechanism:** 32-byte cryptographically secure random token (256-bit entropy).
- **Database Storage:** Stored as SHA-256 hash in `"Session"."token"`.
- **Cookie Name:** `samvad_session`.
- **Cross-Origin Configuration:**
  - `origins = [frontend_url]` (Strictly configured; never wildcard `*`).
  - `allow_credentials = True`.
  - Cookie attributes: `httponly=True`, `samesite="lax"`, `secure=True` (in production), `path="/"`.
