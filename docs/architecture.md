# SAMVAD System Architecture & Technical Design
**School of Basic Sciences, CSJMU Kanpur**  
*Document Version: 2.0 (Master Production Architecture)*  

---

## 1. System Overview & Technology Stack

SAMVAD is architected as a high-integrity, production-conscious web application designed for enterprise deployment in a university environment. It pairs React Server Components (RSC) for zero-client-bundle data fetching with Next.js Server Actions and Route Handlers for server-authenticated mutations.

```
┌────────────────────────────────────────────────────────────────────────┐
│                            Browser Client                              │
│              (Student, Faculty Staff, Admin Interfaces)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (TLS 1.3 / Strict Cookies)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js App Router (14.2)                       │
│    - Edge Middleware: Cookie presence gate & routing defense           │
│    - React Server Components: Server-rendered read pages               │
│    - Server Actions & Route Handlers: Authenticated business mutations│
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────┐
│       Domain Services & Guards       │ │    Private Document Storage   │
│ - Session & Auth Engine (Bcrypt/SHA) │ │ - Local / Cloud Storage       │
│ - RBAC & ABAC Tenancy Scoping        │ │ - Magic-byte MIME Validation  │
│ - Dynamic Routing Engine             │ │ - SHA-256 Content Hash        │
│ - Append-only Timeline Logger        │ │ - Authenticated Stream Proxy  │
└───────────────────┬──────────────────┘ └───────────────────────────────┘
                    │ Prepared Statements
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  Neon Serverless PostgreSQL (18.6)                     │
│  - Runtime Pooler: DATABASE_URL (pgBouncer transaction mode)           │
│  - Migration Direct: DIRECT_URL (Direct session mode for DDL)          │
│  - Relational Schema with Foreign Key Constraints & Custom Enums       │
└────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack Specifications

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `14.2.15` | Server-side rendering, streaming, server actions, route handlers. |
| **Runtime Language** | TypeScript | `5.6.3` | Strict type safety across database schemas, forms, and APIs. |
| **UI & Styling** | Tailwind CSS + PostCSS | `3.4.14` | Navy & gold university palette, accessible WCAG 2.1 AA tokens. |
| **Database** | Neon Serverless PostgreSQL | `PostgreSQL 18.6` | ACID compliance, cloud branching, scale-to-zero compute. |
| **ORM & Migrations** | Prisma ORM | `5.22.0` | Schema-driven typing, declarative migrations, parameterization. |
| **Password Security**| `bcryptjs` | `3.0.3` | Constant-time bcrypt hashing (12 rounds) with timing equalization. |
| **Session Security** | Node `crypto` + HTTP Cookies | Native | 256-bit cryptographically secure tokens, SHA-256 DB storage. |
| **Input Validation** | Zod | `4.6.5` | Strict runtime boundary validation for all forms and API payloads. |
| **Iconography** | `lucide-react` | `0.453.0` | Accessible SVGs with `aria-hidden` attributes. |

---

## 2. Layered Clean Architecture

To enforce separation of concerns, the application follows a 4-tier architectural pattern:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Presentation Layer (src/app/*, src/components/*)                    │
│    - Server Components: Directly read from DB using getSessionUser()   │
│    - Client Components: Interactive modals, form handlers, file inputs │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Form Submissions / Server Actions
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. Application & Guard Layer (src/lib/auth/guard.ts)                   │
│    - requireAuth(): Checks active session and account status           │
│    - requireRole(): Enforces RBAC permissions                          │
│    - Tenancy Check: Enforces ABAC course/department assignment bounds  │
│    - Zod Validation: Validates incoming payloads                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Calls Domain Services
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. Domain Logic & Workflow Engine                                      │
│    - Dynamic Routing: Resolves assigned official via StaffAssignment   │
│    - Workflow Transitions: Validates permitted status/tier changes     │
│    - Timeline Logger: Creates append-only GrievanceTimelineAction rows │
│    - Document Processor: Validates magic-bytes & generates hash        │
│    - Audit Logger: Records admin mutations to SystemAuditLog           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Atomic Operations
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. Data Access Layer (src/lib/prisma.ts)                               │
│    - Prisma Client singleton connection pool                           │
│    - Multi-table atomic transactions via prisma.$transaction           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database & Connection Architecture

### 3.1 Two-Tier Connection Strategy
Neon PostgreSQL requires two distinct connection strings for robust operation:
1. **`DATABASE_URL` (Runtime Pooled):**
   - Connects to Neon's pgBouncer pooler (`-pooler` endpoint, e.g., `ep-...-pooler.ap-southeast-1.aws.neon.tech`).
   - Uses transaction pooling mode to support hundreds of concurrent serverless requests without exhausting PostgreSQL connection limits.
   - Instantiated in `src/lib/prisma.ts`.
2. **`DIRECT_URL` (Migration Direct):**
   - Connects directly to the PostgreSQL compute instance, bypassing pgBouncer.
   - Required by Prisma CLI (`prisma migrate deploy`, `prisma migrate status`) to acquire advisory locks and execute session-level DDL commands.
   - Configured in `prisma/schema.prisma` via `directUrl = env("DIRECT_URL")`.

### 3.2 Secret Protection & Environment Segregation
- `.env.local` and `.env` are strictly excluded from version control via `.gitignore`.
- `.env.example` provides template placeholders only (`YOUR_NEON_PASSWORD`).
- Zero database credentials or connection secrets are exposed to client-side bundles or `NEXT_PUBLIC_*` variables.
- `scripts/db-health.ts` masks database passwords in console logs.

---

## 4. Authentication, Session & Access Control Architecture

### 4.1 Cryptographic Session Model
```
Client Browser                             Next.js Server                       Neon Database
      │                                          │                                    │
      │── 1. POST /api/auth/login ──────────────►│                                    │
      │   (identifier + password)                │── 2. Query User by email/roll ────►│
      │                                          │◄─ 3. Return user record ───────────│
      │                                          │                                    │
      │                                          │── 4. Bcrypt 12-round verify        │
      │                                          │                                    │
      │                                          │── 5. Generate raw token (256-bit)  │
      │                                          │      Compute SHA-256 hash          │
      │                                          │                                    │
      │                                          │── 6. Store SHA-256 hash in DB ────►│
      │                                          │                                    │
      │◄─ 7. Set HTTP-only Cookie ───────────────│                                    │
      │      (samvad_session = rawToken)         │                                    │
      │                                          │                                    │
      │── 8. Subsequent Request + Cookie ───────►│                                    │
      │                                          │── 9. Hash cookie value with SHA-256│
      │                                          │      Lookup Session + User in DB ─►│
      │                                          │◄─ 10. Return user + check active ──│
```

- **Session Generation**: 32 bytes of cryptographically secure random entropy (`crypto.randomBytes(32)`).
- **At-Rest Protection**: Database stores only SHA-256 digests (`hashSessionToken`). A database leak does not expose active session cookies.
- **Timing Equalization**: When an identifier does not exist in the database, `dummyVerifyPassword` executes a 12-round bcrypt calculation against `DUMMY_BCRYPT_HASH`, ensuring constant response latency (~70–100ms) to defeat user enumeration attacks.
- **Immediate Invalidation**: `revokeAllUserSessions(userId)` executes an atomic bulk deletion of all sessions for a user upon account deactivation or password reset.

### 4.2 Server-Side Authorization Boundary
- Edge middleware (`src/middleware.ts`) provides preliminary routing defense by verifying the presence of the session cookie.
- Every Server Component, API route handler, and Server Action performs independent database session validation via `getSessionUser()`, `requireAuth()`, or `requireRole()`.
- Client-side navigation or component visibility is treated purely as UI ergonomics, never as a security boundary.

---

## 5. Dynamic Academic Routing & Authority Model

To fulfill Non-Negotiable Requirement 4, academic units, courses, and authority mappings are decoupled from application code:

```
                  ┌──────────────────────┐
                  │      Department      │
                  │ (e.g. MATH, Physics) │
                  └──────────┬───────────┘
                             │ 1-to-many
                             ▼
                  ┌──────────────────────┐
                  │        Course        │
                  │ (e.g. M.Sc. Math)    │
                  └──────────┬───────────┘
                             │
                             ▼
               ┌───────────────────────────┐
               │      StaffAssignment      │
               │ - userId                  │
               │ - role (CC / HoD)         │
               │ - departmentId            │
               │ - courseId (Nullable)     │
               │ - isActive                │
               │ - assignedAt              │
               │ - unassignedAt            │
               └─────────────┬─────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────┐
  │ Grievance Routing Engine                            │
  │ When a grievance is lodged for Course C in Dept D:  │
  │ 1. Tier 1 Coordinator = StaffAssignment(courseId=C) │
  │ 2. Tier 2 HoD         = StaffAssignment(deptId=D)   │
  │ 3. Tier 3 Director    = User(role=DIRECTOR)         │
  └─────────────────────────────────────────────────────┘
```

- **Zero Hardcoding**: Departments and courses are loaded dynamically from `Department` and `Course` tables.
- **Tenure History**: Reassigning a coordinator does not delete past assignments. Old records have `isActive = false` and `unassignedAt = now()`, preserving historical accountability.
- **Routing Resolution**: When a coordinator logs in, their grievance queue is dynamically queried based on their active assignments:
  `WHERE courseId IN (SELECT courseId FROM StaffAssignment WHERE userId = :currentUserId AND isActive = true)`

---

## 6. Grievance Redressal Workflow & State Machine

```
                              ┌────────────────────┐
                              │     Lodged by      │
                              │      STUDENT       │
                              └─────────┬──────────┘
                                        │
                                        ▼
                              ┌────────────────────┐
                              │     SUBMITTED      │
                              └─────────┬──────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       │
         ┌─────────────────────┐                            │
         │    UNDER_REVIEW     │◄───────────────────────────┘
         │ (Coordinator Tier 1)│
         └──────────┬──────────┘
                    │
         ┌──────────┼────────────────────────────┐
         │ Doc Req  │ Resolved                   │ Forwarded
         ▼          ▼                            ▼
┌─────────────────┐ ┌──────────┐      ┌─────────────────────┐
│AWAITING_STUDENT_│ │ RESOLVED │      │     FORWARDED       │
│      INFO       │ └──────────┘      │  (HoD Tier 2 Queue) │
└────────┬────────┘                   └──────────┬──────────┘
         │                                       │
         │ Uploaded                              ▼
         └───────────────────────────►┌─────────────────────┐
                                      │    UNDER_REVIEW     │
                                      │     (HoD Tier 2)    │
                                      └──────────┬──────────┘
                                                 │
                                      ┌──────────┼───────────────┐
                                      │ Doc Req  │ Resolved /    │ Forwarded
                                      ▼          ▼ Dismissed     ▼
                             ┌─────────────────┐ ┌──────────┐  ┌─────────────────────┐
                             │AWAITING_STUDENT_│ │ RESOLVED/│  │     FORWARDED       │
                             │      INFO       │ │ DISMISSED│  │ (Director Tier 3)   │
                             └─────────────────┘ └──────────┘  └──────────┬──────────┘
                                                                          │
                                                                          ▼
                                                               ┌─────────────────────┐
                                                               │    UNDER_REVIEW     │
                                                               │  (Director Tier 3)  │
                                                               └──────────┬──────────┘
                                                                          │
                                                               ┌──────────┴──────────┐
                                                               ▼                     ▼
                                                          ┌──────────┐          ┌──────────┐
                                                          │ RESOLVED │          │DISMISSED │
                                                          └──────────┘          └──────────┘
```

### Dual-Track Timeline Architecture
Every grievance action is recorded in `GrievanceTimelineAction` with an explicit `visibility` flag:
1. **`PUBLIC_TO_STUDENT`**: Visible to the student on their portal and on the public tracking page (e.g. "Case acknowledged by Course Coordinator", "Forwarded to Department Head", "Resolution Issued").
2. **`INTERNAL_STAFF_ONLY`**: Visible exclusively to authorized staff officials (e.g., faculty internal remarks, HoD forwarding notes, investigative directives). Students and public viewers cannot access internal remarks.

---

## 7. Secure Document Ingestion & Streaming Pipeline

1. **Validation at Ingestion**:
   - Client sends file to Server Action / Route Handler.
   - Server validates MIME type (`application/pdf`, `image/jpeg`, `image/png`).
   - Server reads initial 512 bytes to verify magic numbers:
     - PDF: `%PDF-` (`0x25 0x50 0x44 0x46`)
     - PNG: `\x89PNG\r\n\x1a\n` (`0x89 0x50 0x4E 0x47`)
     - JPEG: `\xFF\xD8\xFF`
   - File size capped at 5 MB per attachment.
2. **Checksum & Storage**:
   - SHA-256 checksum calculated on file stream.
   - Storage key generated with random UUID: `grievances/[grievanceId]/[uuid]_[sanitizedFileName]`.
   - File metadata written to `GrievanceDocument` table.
3. **Protected Streaming**:
   - Evidentiary files are never served from public web roots (`public/`).
   - Streamed via authenticated route `/api/documents/[documentId]`.
   - Route verifies caller session: must be the student owner or an authorized official assigned to that grievance's course/department or Director.

---

## 8. Rate Limiting & Multi-Instance Roadmap

- **Current Status**: Local in-memory sliding-window limiter in `src/lib/auth/rate-limit.ts`.
- **Architectural Blocker**: In-memory storage is process-bound. In multi-pod deployments or serverless platforms (Vercel), memory resets on restarts and cold boots, and is not shared across instances.
- **Production Roadmap**:
  - Connect to an external shared Redis store (Upstash Redis via `@upstash/ratelimit`).
  - Implement compound rate limit keying (`client_ip:identifier`) to prevent deliberate account lockout attacks against known student roll numbers.
  - Fail-Secure policy with in-memory fallback during external cache outages.
