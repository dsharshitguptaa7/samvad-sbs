# SAMVAD System Architecture & Technical Design
**School of Basic Sciences, CSJMU Kanpur**

---

## 1. System Overview & Technology Stack

SAMVAD is architected as a high-integrity, serverless-ready web application using the modern TypeScript ecosystem. It leverages React Server Components (RSC) for rapid first-contentful paint and data confidentiality, paired with Next.js Server Actions for secure, mutation-driven workflows.

```
                      ┌─────────────────────────────────────────┐
                      │            Browser Client               │
                      │  (Student, Faculty, Admin Interfaces)   │
                      └────────────────────┬────────────────────┘
                                           │ HTTPS / TLS 1.3
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │          Next.js App Router             │
                      │    (Edge Middleware & Route Handlers)   │
                      └─────────────┬─────────────┬─────────────┘
                                    │             │
                ┌───────────────────┘             └───────────────────┐
                ▼                                                     ▼
┌───────────────────────────────┐                     ┌───────────────────────────────┐
│     Server Components &       │                     │    Private Document Storage   │
│       Server Actions          │                     │    (S3-Compatible / R2 / Blob)│
│  - Input Validation (Zod)     │                     │  - Strict Pre-signed URLs     │
│  - RBAC & ABAC Enforcement    │                     │  - Authenticated Stream Proxy │
│  - Audit Log Orchestrator     │                     └───────────────────────────────┘
└───────────────┬───────────────┘
                │ Prisma ORM (Prepared Statements)
                ▼
┌───────────────────────────────┐
│   Neon PostgreSQL (Cloud)     │
│  - pgBouncer Pooling          │
│  - Normalized Schema          │
│  - Foreign Key Constraints    │
└───────────────────────────────┘
```

### Technology Stack Specifications

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router, React 19 / Server Components) | Built-in streaming, zero-bundle overhead for data-fetching pages, type-safe Server Actions. |
| **Language** | TypeScript (Strict Mode) | End-to-end type safety from database schemas to UI forms. |
| **Styling & UI** | Tailwind CSS + Radix UI (shadcn/ui design primitives) | High accessibility compliance (WCAG 2.1 AA out-of-the-box), lightweight, zero runtime CSS. |
| **Database** | Neon Serverless PostgreSQL | ACID compliance, scale-to-zero efficiency, instant branching for staging/test environments, built-in connection pooling. |
| **ORM** | Prisma ORM | Strong schema-driven typing, declarative migrations, automated query parameterization. |
| **Validation** | Zod | Dual-layer validation (client form feedback and mandatory server boundary verification). |
| **Authentication** | Session-based / Iron-Session or Auth.js (Credentials Provider) | Secure, HTTP-only, `SameSite=Strict`, encrypted cookie sessions without client-side token exposure. |
| **Icons** | Lucide React | Clean, accessible iconography with aria-hidden defaults. |

---

## 2. Layered Clean Architecture

To enforce clean separation of concerns and deterministic execution, SAMVAD adheres to a strict 4-tier layer pattern:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Presentation Layer (App Router Pages, Modals, Forms)     │
│    - React Server Components (Read-only data rendering)     │
│    - Client Components (Interactive tabs, file upload UI)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Calls Server Actions
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Application Layer (Server Actions & Route Handlers)      │
│    - Authenticate session context                           │
│    - Validate schema via Zod                                │
│    - Enforce permissions (RBAC / ABAC)                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Dispatches to
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Domain Service Layer (Business Logic & Workflow Engine)  │
│    - State machine validation (Valid tier transitions)      │
│    - Timeline action generation                             │
│    - File hash & metadata verification                      │
│    - Notification dispatcher                                │
└──────────────────────────────┬──────────────────────────────┘
                               │ Uses
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Data Access Layer (Prisma ORM & PostgreSQL)              │
│    - Atomic `$transaction` blocks                          │
│    - Append-only audit logging                              │
│    - Scoped departmental queries                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Security Architecture

### 3.1 Authentication & Session Management
- **Password Security**: Strong hashing with Argon2id or bcrypt ($12$ rounds minimum). Passwords are never logged or returned in queries.
- **Session Tokens**: Cryptographically random 256-bit entropy tokens stored in PostgreSQL sessions table or encrypted HTTP-only session cookies with flags:
  - `HttpOnly = true` (Prevents XSS extraction).
  - `Secure = true` (HTTPS only).
  - `SameSite = Strict` (Prevents CSRF attacks).
  - `Max-Age = 28800` (8 hours active expiration).

### 3.2 Access Control (RBAC & ABAC)
Access control is implemented in two tiers:
1. **Role-Based Access Control (RBAC)**: Validates if the user has the overarching role required (e.g., `COURSE_COORDINATOR`).
2. **Attribute-Based Access Control (ABAC)**: Enforces departmental and course tenancy:
   ```typescript
   // Conceptual tenancy guard
   if (actor.role === 'COURSE_COORDINATOR') {
     const isAssigned = await prisma.staffAssignment.findFirst({
       where: {
         userId: actor.id,
         courseId: complaint.courseId,
         isActive: true,
       }
     });
     if (!isAssigned) throw new ForbiddenError("Not authorized for this course.");
   }
   ```

### 3.3 Protection Against Common Web Vulnerabilities
- **SQL Injection**: Prevented inherently via Prisma ORM parameterized queries.
- **Cross-Site Scripting (XSS)**: Handled by React's native JSX escaping and DOMPurify for any sanitized rich-text fields.
- **Cross-Site Request Forgery (CSRF)**: Server Actions validate origin headers and utilize `SameSite=Strict` session cookies.
- **Rate Limiting**: In-memory token bucket or Upstash Redis rate limiter on authentication attempts (5 attempts per 15 minutes per IP).

---

## 4. File Security & Document Storage Pipeline

Supporting documents (transcripts, medical certificates, grade cards, payment receipts) contain sensitive personal data and must be protected with enterprise-grade isolation.

### 4.1 Storage Strategy
- Files are **never stored in the public web root** or public S3 buckets.
- Files reside in a private object store (e.g., S3/Cloudflare R2) or an isolated local secure storage volume inaccessible to direct HTTP requests.

### 4.2 Upload Pipeline
1. **Pre-Upload Validation (Client)**: Check file size ($\le 5\text{MB}$) and client MIME type.
2. **Server Action Ticket Generation**:
   - The user requests an upload ticket.
   - The server validates user permission on the target complaint.
   - Files are named using UUIDv4 keys (e.g., `docs/2026/03/<uuidv4>.pdf`) to eliminate directory traversal risks and sanitize filenames.
3. **Magic Byte Inspection**:
   - The server inspects the first 512 bytes (magic numbers) of uploaded files to ensure true MIME type (e.g., `%PDF-` for PDFs, `\xFF\xD8\xFF` for JPEG, `\x89PNG` for PNG).
   - Executable formats (`.exe`, `.sh`, `.bat`, `.js`, `.html`, `.svg` with scripts) are rejected unconditionally.

### 4.3 Secure File Access / Download
- Direct object storage URLs are hidden.
- Files are accessed via:
  - **Authenticated Proxy Route**: `/api/complaints/[id]/documents/[docId]/download`
  - The route validates that the requester is either the complaint owner (Student), the assigned Coordinator, the Department HoD, the Director, or an Admin.
  - Returns file stream with HTTP headers:
    - `Content-Disposition: attachment; filename="sanitized_original_name.pdf"`
    - `Content-Type: application/pdf`
    - `X-Content-Type-Options: nosniff`
    - `Cache-Control: private, no-cache, no-store, must-revalidate`

---

## 5. Complaint State Machine & Lifecycle

The grievance follows a deterministic finite state machine (FSM). Invalid transitions are rejected at the domain service level.

```
                  ┌───────────────┐
                  │   SUBMITTED   │
                  └───────┬───────┘
                          │ Coordinator picks up
                          ▼
                  ┌───────────────┐
       ┌─────────►│ UNDER_REVIEW  │◄─────────┐
       │          └───────┬───────┘          │
       │                  │                  │
Student provides          │ Request docs     │ HoD / Director picks up
clarification             ▼                  │
       │       ┌──────────────────────┐      │
       └───────┤AWAITING_STUDENT_INFO │      │
               └──────────────────────┘      │
                          │                  │
                          ├──────────────────┘
                          │ Forward (CC -> HoD or HoD -> Director)
                          ▼
                  ┌───────────────┐
                  │   FORWARDED   │
                  └───────┬───────┘
                          │ Resolve
                          ▼
                  ┌───────────────┐
                  │   RESOLVED    │
                  └───────────────┘
```

### State Definitions
- `SUBMITTED`: Lodged by student; pending initial acknowledgement by Course Coordinator.
- `UNDER_REVIEW`: Actively being evaluated by the authorized officer at the current tier.
- `AWAITING_STUDENT_INFO`: Document request issued to student; awaiting student upload.
- `FORWARDED`: Formally transferred to the next higher administrative tier.
- `RESOLVED`: Final closure issued with formal findings and remedy recorded.
- `DISMISSED`: Grievance evaluated and formally closed with recorded grounds (e.g. invalid jurisdiction).

---

## 6. Audit Trail & Immutability Architecture

Accountability requires that no action, remark, or transition can be edited or deleted once recorded.

### 6.1 Data Structure
The `GrievanceTimelineAction` table acts as an append-only ledger:
- `id`: Unique identifier (UUID).
- `complaintId`: Associated grievance ID.
- `actorId`: User ID of who took the action.
- `actorRole`: Snapshot of role at time of action.
- `actionType`: `SUBMITTED`, `ASSIGNED`, `UNDER_REVIEW_MARKED`, `DOCUMENTS_REQUESTED`, `DOCUMENTS_SUBMITTED`, `INTERNAL_REMARK_ADDED`, `FORWARDED`, `RESOLVED`, `DISMISSED`.
- `fromStatus` & `toStatus`: State machine snapshot.
- `fromTier` & `toTier`: Tier level transitions (e.g., `TIER_1_COORDINATOR` $\rightarrow$ `TIER_2_HOD`).
- `remarks`: Human comments / rationale.
- `visibility`: `PUBLIC_TO_STUDENT` or `INTERNAL_STAFF_ONLY`.
- `ipAddress`: Client IP for forensic integrity.
- `createdAt`: Immutable timestamp (`now()`).

### 6.2 Transactional Guarantees
All state transitions are executed within Prisma `$transaction([ ... ])` blocks ensuring that status updates and audit logs are atomic. If the audit log fails, the status update rolls back completely.

---

## 7. Error Handling & Resilience

1. **Client Error Boundaries**: React `error.tsx` boundaries at root and dashboard sub-routes to gracefully catch and display recovery options without application crashes.
2. **Structured Server Action Responses**: Standardized JSON response envelope:
   ```typescript
   type ActionResponse<T> = 
     | { success: true; data: T; message?: string }
     | { success: false; error: string; code: 'UNAUTHORIZED' | 'VALIDATION_FAILED' | 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'INTERNAL_ERROR' };
   ```
3. **Database Connection Resilience**: Neon serverless pooling via pgBouncer connection string ensures no connection exhaustion under burst loads.

---

## 8. Accessibility & Usability (WCAG 2.1 AA)

- **Semantic HTML**: Landmarks (`<main>`, `<nav>`, `<aside>`, `<header>`).
- **Form Controls**: Explicit `<label>` elements linked via `htmlFor`, error messages linked with `aria-errormessage` and `aria-invalid`.
- **Keyboard Navigation**: Standard Tab / Shift+Tab cycling, Escape to dismiss modals, visible focus indicators (`focus-visible:ring-2 focus-visible:ring-primary`).
- **Contrast**: Strict compliance with APCA / WCAG AA ratios (text $\ge 4.5:1$, icons $\ge 3:1$).

---

## 9. Deployment & Infrastructure Strategy

- **Application Host**: Vercel or Node.js container (Docker) deployed on institutional / cloud server.
- **Database**: Neon Serverless PostgreSQL (AWS ap-south-1 / Mumbai or closest low-latency region).
- **Environment Variables**:
  - `DATABASE_URL`: Direct connection string for Prisma migrations.
  - `DATABASE_URL_POOLED`: Pooled connection string (`?pgbouncer=true`) for Next.js runtime.
  - `SESSION_SECRET`: 64-character secret for cryptographic signing.
  - `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`: Private storage configuration.
