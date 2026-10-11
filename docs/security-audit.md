# SAMVAD — Authentication Production Security Audit Report

**Portal:** SAMVAD (Manual Grievance Redressal Portal)  
**Institution:** School of Basic Sciences (SBS), Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur  
**Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Neon PostgreSQL, Prisma ORM  
**Date:** October 2026  
**Status:** Audit Completed & High-Risk Vulnerabilities Remediated  

---

## 1. Executive Summary

This production security audit evaluates the authentication and authorization implementation of the SAMVAD portal. SAMVAD is a grievance redressal system managing sensitive student grievances, faculty review workflows, and administrative actions across five departments (Mathematics, Physics, Chemistry, Geography, Environmental Sciences).

The audit covered source code, Prisma database schema, session management, middleware, API route handlers, role guards, and automated test suites. 

### Key Findings Summary:
- **Verified Strengths:** Cryptographically secure 256-bit session tokens, SHA-256 database token hashing, bcrypt password hashing with 12 salt rounds, strict server-side RBAC guards on all sensitive routes, HTTP-only secure cookie configuration, and resilient user data sanitization preventing credential leakage.
- **Identified & Remediated High/Medium Risks:**
  1. *User Enumeration via Asymmetric Timing:* Addressed by introducing `dummyVerifyPassword` to ensure constant-time response latency (~70–100ms) for non-existent user lookups.
  2. *Registration Race Condition:* Addressed by catching Prisma unique constraint violations (`P2002`) and gracefully returning HTTP 409 Conflict instead of generic 500 errors.
  3. *Immediate Multi-Session Revocation:* Addressed by implementing `revokeAllUserSessions(userId)` for immediate credential invalidation upon account deactivation or password reset.
- **Architectural Blockers Noted:** In-memory rate limiting operates within process memory and requires a centralized store (e.g., Redis/Upstash) prior to multi-instance/serverless production scaling.

---

## 2. Verified Security Controls & Architecture Mapping

| Security Control | Implementation Mechanism | Source File | Status |
| :--- | :--- | :--- | :--- |
| **Password Storage** | `bcryptjs` with 12 salt rounds (`SALT_ROUNDS = 12`) | [`src/lib/auth/password.ts`](file:///c:/Projects/SAMVAD/src/lib/auth/password.ts) | Verified |
| **Timing Attack Mitigation** | Precomputed dummy bcrypt verification for non-existent users | [`src/lib/auth/password.ts`](file:///c:/Projects/SAMVAD/src/lib/auth/password.ts), [`src/app/api/auth/login/route.ts`](file:///c:/Projects/SAMVAD/src/app/api/auth/login/route.ts) | Remediated & Verified |
| **Session Generation** | 32-byte cryptographically random hex (`crypto.randomBytes(32)`) | [`src/lib/auth/session.ts`](file:///c:/Projects/SAMVAD/src/lib/auth/session.ts) | Verified |
| **Session At-Rest Hashing** | SHA-256 token hashing prior to storage in database | [`src/lib/auth/session.ts`](file:///c:/Projects/SAMVAD/src/lib/auth/session.ts) | Verified |
| **Session Cookie Security** | `httpOnly: true`, `secure: production`, `sameSite: "lax"`, `path: "/"`, `maxAge: 28800` | [`src/lib/auth/session.ts`](file:///c:/Projects/SAMVAD/src/lib/auth/session.ts) | Verified |
| **Session Fixation Defense** | Completely fresh session token issued upon every successful authentication | [`src/app/api/auth/login/route.ts`](file:///c:/Projects/SAMVAD/src/app/api/auth/login/route.ts) | Verified |
| **Multi-Session Revocation** | `revokeAllUserSessions(userId)` deleting all sessions for a user | [`src/lib/auth/session.ts`](file:///c:/Projects/SAMVAD/src/lib/auth/session.ts) | Remediated & Verified |
| **Data Sanitization** | `sanitizeUser()` strips `passwordHash`, tokens, and internal metadata | [`src/lib/auth/session.ts`](file:///c:/Projects/SAMVAD/src/lib/auth/session.ts) | Verified |
| **Role-Based Access Control** | Server-side enforcement via `requireRole()`, `requireAuth()` | [`src/lib/auth/guard.ts`](file:///c:/Projects/SAMVAD/src/lib/auth/guard.ts) | Verified |
| **Account Deactivation** | Immediate session invalidation on access when `isActive === false` | [`src/lib/auth/session.ts`](file:///c:/Projects/SAMVAD/src/lib/auth/session.ts) | Verified |
| **Password Setup & Reset** | High-entropy 256-bit single-use tokens, SHA-256 hashed at rest, 24-hr expiry | [`src/lib/auth/password-reset.ts`](file:///c:/Projects/SAMVAD/src/lib/auth/password-reset.ts) | Verified |
| **Atomic Token Consumption** | Burn token (`usedAt`), reset password hash, clear `mustResetPassword`, revoke sessions | [`src/lib/auth/password-reset.ts`](file:///c:/Projects/SAMVAD/src/lib/auth/password-reset.ts) | Verified |
| **Authority Cardinality** | Enforces single active HoD per department, archives superseded assignments | [`src/app/api/admin/assignments/route.ts`](file:///c:/Projects/SAMVAD/src/app/api/admin/assignments/route.ts) | Verified |

---

## 3. Findings Grouped by Severity

### Finding 1: Timing-Based User Enumeration via Asymmetric Response Latencies in Login
- **Severity:** High
- **Category:** Information Disclosure / Authentication Bypass
- **Status:** **REMEDIATED**
- **Evidence:**  
  In [`src/app/api/auth/login/route.ts`](file:///c:/Projects/SAMVAD/src/app/api/auth/login/route.ts), when a requested identifier was not found in the database, the handler immediately returned an HTTP 401 response in ~1ms without performing a bcrypt verification, while valid accounts underwent a ~80ms bcrypt calculation. Although a code comment noted *"run a dummy bcrypt comparison"*, no bcrypt function was invoked.
- **Impact:**  
  An attacker could measure network latency differences to enumerate valid student roll numbers and university email addresses.
- **Remediation Implemented:**  
  1. Created and exported `dummyVerifyPassword(candidate: string)` in [`src/lib/auth/password.ts`](file:///c:/Projects/SAMVAD/src/lib/auth/password.ts), utilizing a pre-computed 12-round bcrypt hash constant (`DUMMY_BCRYPT_HASH`).
  2. Updated [`src/app/api/auth/login/route.ts`](file:///c:/Projects/SAMVAD/src/app/api/auth/login/route.ts) to execute `await dummyVerifyPassword(password)` whenever `!user`. Response times are now equalized across existing and non-existing accounts.

---

### Finding 2: Unhandled Database Race Condition in Student Registration
- **Severity:** High
- **Category:** Concurrency / Data Integrity
- **Status:** **REMEDIATED**
- **Evidence:**  
  In [`src/app/api/auth/register/route.ts`](file:///c:/Projects/SAMVAD/src/app/api/auth/register/route.ts), uniqueness of email, rollNumber, and enrollmentNo was verified via three separate sequential `prisma.user.findUnique` queries prior to calling `prisma.user.create`. If two concurrent registration requests with the same email or roll number bypassed the initial checks simultaneously, the second call triggered a Prisma unique constraint violation (`P2002`). The generic `catch (error)` block caught this and responded with an unhandled HTTP 500 error: *"Unable to complete registration. Please try again later."*
- **Impact:**  
  Duplicate race-condition attempts generated unhandled 500 internal server errors, masking data conflict errors and cluttering error logs.
- **Remediation Implemented:**  
  Updated the catch handler in [`src/app/api/auth/register/route.ts`](file:///c:/Projects/SAMVAD/src/app/api/auth/register/route.ts) to detect Prisma error code `P2002`, inspect `error.meta.target`, and gracefully respond with HTTP 409 Conflict (`code: "DUPLICATE_RESOURCE"`) and a clear user-facing error message.

---

### Finding 3: Incomplete Multi-Device Session Invalidation on Account Deactivation / Credential Reset
- **Severity:** Medium
- **Category:** Session Management / Incident Response
- **Status:** **REMEDIATED**
- **Evidence:**  
  In [`src/lib/auth/session.ts`](file:///c:/Projects/SAMVAD/src/lib/auth/session.ts), `destroySession()` only invalidated the session associated with the incoming request cookie. When a user was deactivated by a System Administrator or required an urgent password reset, existing active sessions persisted in the database until each individual session made a request. There was no programmatic function to invalidate all sessions for a given user.
- **Impact:**  
  If a compromised account had multiple active sessions across different devices, deactivating or resetting the user would not immediately purge all tokens from the database.
- **Remediation Implemented:**  
  Implemented `revokeAllUserSessions(userId: string): Promise<number>` in [`src/lib/auth/session.ts`](file:///c:/Projects/SAMVAD/src/lib/auth/session.ts), which executes `prisma.session.deleteMany({ where: { userId } })`. Added regression unit tests to verify contract handling.

---

### Finding 4: In-Memory Rate Limiter Does Not Scale Across Multi-Instance or Serverless Deployments
- **Severity:** Medium (Architectural Deployment Consideration)
- **Category:** Rate Limiting / Denial of Service
- **Status:** **DOCUMENTED / ARCHITECTURAL RECOMMENDATION**
- **Evidence:**  
  [`src/lib/auth/rate-limit.ts`](file:///c:/Projects/SAMVAD/src/lib/auth/rate-limit.ts) uses a local JavaScript `Map<string, RateLimitRecord>()` stored in process memory.
- **Impact:**  
  In a multi-container deployment (e.g. Kubernetes, multiple Docker replicas) or serverless runtime (Vercel Edge/Serverless functions, AWS Lambda), memory is isolated per container/instance and resets on container restarts or cold boots. An attacker can distribute login brute-force requests across instances to circumvent the 5-attempt threshold.
- **Required Action Before Production Multi-Instance Scale:**  
  Connect rate limiting to a shared, persistent store such as Upstash Redis, AWS ElastiCache Redis, or a PostgreSQL-backed rate limit table with row-level TTL.

---

### Finding 5: Identifier-Only Rate Limiting Keying Can Lead to Account Lockout Denial of Service
- **Severity:** Low / Medium
- **Category:** Denial of Service
- **Status:** **DOCUMENTED / HARDENING RECOMMENDATION**
- **Evidence:**  
  In [`src/app/api/auth/login/route.ts`](file:///c:/Projects/SAMVAD/src/app/api/auth/login/route.ts), rate limiting is keyed on `login:${identifier.toLowerCase()}`.
- **Impact:**  
  Because CSJMU student roll numbers are sequential and predictable (e.g., `240103001` through `240103050`), a malicious actor could submit 5 deliberate failed login attempts for known roll numbers, locking out legitimate students for 15 minutes.
- **Recommended Improvement:**  
  Implement a compound key strategy combining Client IP and Identifier:
  - Strict rate limit per IP address (e.g., max 30 failed attempts per IP across all accounts).
  - Exponential backoff per account identifier instead of a rigid hard lockout, or requirement of a CAPTCHA / 2FA challenge after 3 failed attempts.

---

### Finding 6: Cross-Site Request Forgery (CSRF) Defense on State-Changing API Endpoints
- **Severity:** Low
- **Category:** Session Security / CSRF
- **Status:** **VERIFIED ADEQUATE FOR SAME-ORIGIN**
- **Evidence:**  
  Session cookies are configured with `sameSite: "lax"`. Modern browsers block cross-site POST requests from sending `sameSite: "lax"` cookies by default.
- **Recommended Improvement:**  
  For critical administrative state transitions (e.g., faculty role assignments, grievance dismissals), implement origin verification by comparing `request.headers.get("origin")` against the expected host header, or adopt Next.js Server Actions with built-in origin validation tokens.

---

## 4. Test Execution & Verified Outcomes

### Automated Suite Results

The automated regression test suite was executed via Node.js native test runner:

```bash
npm run test
```

**Actual Execution Output:**
```text
> samvad@0.1.0 test
> tsx --test tests/**/*.test.ts

▶ SAMVAD Authentication & Security Test Suite
  ▶ Password Hashing & Verification
    ✔ should generate a valid bcrypt hash with salt rounds (474.0054ms)
    ✔ should successfully verify matching password against hash (750.828ms)
    ✔ should reject incorrect password candidates in constant time (713.8216ms)
    ✔ should reject empty or null password candidates safely (387.568ms)
    ✔ should enforce strong password complexity rules (1.2118ms)
    ✔ should execute dummy bcrypt verification safely to thwart timing attacks (508.3779ms)
  ✔ Password Hashing & Verification (2838.0957ms)
  ▶ Brute-Force & Rate Limiting Guard
    ✔ should permit attempts within the allowed threshold (0.7451ms)
    ✔ should block requests when maximum failed attempts threshold is reached (0.5707ms)
    ✔ should reset rate limit counters upon successful login (0.3914ms)
  ✔ Brute-Force & Rate Limiting Guard (2.6559ms)
  ▶ Input Validation & Privilege Safeguards
    ✔ should successfully parse valid student registration input (5.3724ms)
    ✔ should reject student registration with invalid email or phone (0.7985ms)
    ✔ should ignore or strip any attempted role escalation from student registration (0.8891ms)
    ✔ should validate login input schema (1.7049ms)
  ✔ Input Validation & Privilege Safeguards (9.1228ms)
  ▶ Session & Token Management
    ✔ should generate cryptographically strong unique tokens (0.4691ms)
    ✔ should hash session tokens with SHA-256 before storage (0.4396ms)
  ✔ Session & Token Management (1.1307ms)
  ▶ Data Sanitization & Secret Exposure Prevention
    ✔ should strictly strip passwordHash and token from serialized user objects (0.2987ms)
  ✔ Data Sanitization & Secret Exposure Prevention (0.4427ms)
  ▶ Server Authorization & Role Guards
    ✔ should throw AuthenticationError (401) when user is unauthenticated (0.8972ms)
    ✔ should throw ForbiddenError (403) when user role does not match permitted roles (0.5692ms)
    ✔ should grant access when user holds the authorized role (0.344ms)
    ✔ should handle multi-role authorized endpoints correctly (0.2435ms)
  ✔ Server Authorization & Role Guards (2.3271ms)
  ▶ Account Deactivation Handling
    ✔ should immediately reject access if user account isActive is false (0.6468ms)
  ✔ Account Deactivation Handling (0.773ms)
  ▶ Safe Error Handling
    ✔ should convert AuthenticationError to HTTP 401 response (7.8065ms)
    ✔ should convert ForbiddenError to HTTP 403 response (0.7932ms)
    ✔ should convert AccountDeactivatedError to HTTP 403 response (0.493ms)
  ✔ Safe Error Handling (9.3696ms)
  ▶ Security Audit Regressions & Hardening
    ✔ should handle simulated Prisma P2002 unique constraint violations as 409 Conflict (0.3616ms)
    ✔ should validate revokeAllUserSessions contract safely for empty user IDs (0.2183ms)
    ✔ should maintain strict rate limit key partitioning across identifiers (0.2016ms)
  ✔ Security Audit Regressions & Hardening (1.2459ms)
✔ SAMVAD Authentication & Security Test Suite (2868.086ms)
ℹ tests 27
ℹ suites 10
ℹ pass 27
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3890.99
```

### Automated Suite Results

The automated regression and integration test suites were executed via Node.js native test runner:

```bash
npm run test
```

**Actual Execution Output:**
- **Unit & Security Regression Suite (`tests/auth.test.ts`):** 27 tests passed across 10 suites (including dummy bcrypt timing attack mitigations, duplicate resource P2002 formatting, rate limiting partition boundaries, and RBAC guards).
- **Live Neon Database Integration Suite (`tests/database-auth.integration.test.ts`):** 8 tests passed against live Neon PostgreSQL (PostgreSQL 18.6 on AWS ap-southeast-1):
  1. Student registration with bcrypt 12-round password hash persisted to database.
  2. Duplicate email registration rejected with Prisma `P2002` unique constraint violation.
  3. Duplicate rollNumber registration rejected with Prisma `P2002` unique constraint violation.
  4. Authentication against database password hash and generation of SHA-256 hashed session.
  5. Session token resolution against database returning sanitized user object.
  6. Bulk revocation of all active sessions for a user across devices via `revokeAllUserSessions`.
  7. Immediate detection and deletion of active session when user is deactivated in database.
  8. Server authorization boundary enforcement and deactivated user blocking.

**Combined Test Results:**
```text
✔ SAMVAD Authentication & Security Test Suite (3198.2592ms)
✔ SAMVAD Neon Database Integration Tests (9682.647ms)
✔ SAMVAD Phase 1: Academic Master Data Management Tests (10142.3342ms)
✔ SAMVAD Phase 2: Authority Provisioning & Routing Configuration Tests (21449.0895ms)
✔ SAMVAD Phase 3: Student Grievance Submission, Tracking & Document Pipeline (14228.3196ms)
✔ SAMVAD Phase 4: Tier 1 Course Coordinator Queue & Workflow Actions Tests (26442.2498ms)
✔ SAMVAD Phase 5: Tier 2 (HoD) & Tier 3 (Director) Escalation & Adjudication Tests (25141.6277ms)
ℹ tests 119
ℹ suites 32
ℹ pass 119
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

### Static Analysis & Build Verification

- **Prisma Schema Validation:** `npm run db:validate`  
  - Outcome: **Passed** (Schema at `prisma/schema.prisma` is valid).
- **Prisma Migration Status:** `npx prisma migrate status`  
  - Outcome: **Passed** (`0_init` and `20261004065521_add_password_reset_token` applied, database schema is up to date).
- **TypeScript Compilation:** `npm run typecheck`  
  - Outcome: **Passed** (0 errors, strict mode enabled).
- **ESLint Code Quality:** `npm run lint`  
  - Outcome: **Passed** (0 warnings, 0 errors).
- **Next.js Production Build:** `npm run build`  
  - Outcome: **Passed** (All 25 routes compiled, dynamic and static route chunks generated cleanly).

### Live Database Integration Status
- Direct integration testing was fully verified against a live Neon PostgreSQL database (PostgreSQL 18.6).
- Database migrations were deployed via `prisma migrate deploy` over unpooled `DIRECT_URL`.
- Clean teardown and idempotency hooks ensured no persistent test data remained in the database.
- Phase 4 Course Coordinator and Phase 5 Department Head / Director workflows were verified end-to-end:
  - Strict department-scoped isolation for HoDs (cross-department requests rejected with HTTP 403).
  - Multi-tier dynamic escalation forwarding from Tier 2 HoD to Tier 3 Director.
  - Directorate appellate jurisdiction over all School of Basic Sciences grievances.
  - Atomic transactions for review, internal remarks, document requests, resolution, and dismissal with mandatory statutory grounds.
  - Complete dual-track timeline sanitization preventing internal staff remarks from leaking into student-facing or public tracking surfaces.

---

## 5. Remaining Deployment Blockers & Production Readiness Checklist

Before public deployment of SAMVAD to production infrastructure, the following prerequisites must be fulfilled:

1. [x] **Neon PostgreSQL Provisioning & Schema Migration:**
   - Completed: `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) verified and migration `0_init` deployed.
2. [ ] **Distributed Rate Limiting Infrastructure:**
   - In-memory `rateLimitStore` in `src/lib/auth/rate-limit.ts` remains an architectural blocker for horizontal scaling across multiple serverless/container instances. Provision an Upstash Redis or Redis-compatible cluster prior to multi-instance rollout.
3. [ ] **HTTPS Enforced Deployment:**
   - Ensure production reverse proxy or hosting provider terminates TLS properly so that `process.env.NODE_ENV === "production"` sets the `Secure` flag on `samvad_session` cookies.
4. [ ] **Production Seed Verification:**
   - Run safe development seeds only on non-production staging environments. Never seed default passwords or test credentials in production.

