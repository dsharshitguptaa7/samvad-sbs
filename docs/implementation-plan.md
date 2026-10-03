# SAMVAD Implementation & Delivery Plan
**School of Basic Sciences, CSJMU Kanpur**

---

## 1. Phased Delivery Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 0: Foundation & Bootstrap                                        │
│ Next.js App Router, TypeScript, Tailwind, Prisma, Neon Connection      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Authentication & Session Engine                               │
│ Cookie Sessions, Role Guard Middleware, Staff Password Resets          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Academic Master Data & Staff Mapping                          │
│ Departments, Courses, Staff Assignments, System Audit Logs             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Student Grievance Lodging & Secure Upload Pipeline            │
│ Multi-step Grievance Form, Magic-byte Validation, Tracking Tokens      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4: Tier 1 (Course Coordinator) Workflow                          │
│ Course Queue, Review, Doc Requests, Forwarding to HoD, Course Resol.   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 5: Tier 2 (HoD) & Tier 3 (Director) Escalation Engine            │
│ Departmental Queue, SBS School Queue, Executive Directives & Closure   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 6: Student Clarification Portal & Timeline History               │
│ Document Response Loop, Dual-Track Timeline, Protected File Streaming  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 7: Accessibility, Security Hardening, Verification & Deployment  │
│ WCAG 2.1 AA Verification, Penetration Checks, Neon Production Deploy   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase Breakdown & Deliverables

### Phase 0: Project Setup & Technical Foundation
- Initialize Next.js 14/15 App Router project with TypeScript strict mode.
- Configure Tailwind CSS, PostCSS, and Radix UI / shadcn/ui components.
- Configure Neon PostgreSQL connection with connection pooling (`pgBouncer`) and direct migration URL.
- Setup Prisma ORM, seed script for initial SBS departments (*Mathematics, Physics, Chemistry, Geography, Environmental Sciences*) and Super Admin account.
- Configure ESLint, Prettier, and Git commit hygiene.

### Phase 1: Authentication, Session Management & RBAC Guard
- Implement password hashing using Argon2id/bcrypt.
- Implement session store with HTTP-only, `SameSite=Strict` secure cookies.
- Create role-guard middleware (`middleware.ts`) and server-side authorization helpers (`requireAuth`, `requireRole`, `requireScope`).
- Student self-registration and login views with student validation.
- Staff login with mandatory password change flag on first login (`mustResetPassword`).

### Phase 2: Academic Master Data & Staff Assignment
- Admin Dashboard UI:
  - Department management (Active toggle, department code, name).
  - Course management linked to parent departments.
  - Staff onboarding (provisioning Course Coordinators, HoDs, Director).
  - Staff course/department assignment interface with tenure tracking.
  - Staff credential reset trigger with temporary password generation.
- Append-only administrative action logging in `SystemAuditLog`.

### Phase 3: Student Grievance Filing & Document Upload Engine
- Student Dashboard layout:
  - "Lodge New Grievance" wizard:
    - Step 1: Course and Category selection (cascading dropdowns).
    - Step 2: Subject, detailed description, relief sought.
    - Step 3: Evidentiary document upload (max 3 files, $\le 5\text{MB}$ each).
- Secure upload processing:
  - Magic-byte verification for PDF/JPEG/PNG.
  - Cryptographic SHA-256 checksum computation.
  - Storage into private object storage or protected local storage path.
- Unique tracking number generation (`CSJMU-SBS-2026-[DEPT]-[SEQ]`).

### Phase 4: Tier 1 (Course Coordinator) Workflow
- Coordinator Dashboard:
  - Scoped queue filtered strictly to assigned courses.
  - Grievance detail view with student submission and attachments.
  - Action panel:
    - Mark *Under Review*.
    - Issue *Document Request* (sets status to `AWAITING_STUDENT_INFO`).
    - Add *Internal Staff Remark* (staff-only visibility).
    - *Resolve Grievance* (enter resolution terms and mark resolved).
    - *Forward to Department Head* (with mandatory escalation justification).
- Transactional state updates creating immutable `GrievanceTimelineAction` records.

### Phase 5: Tier 2 (HoD) & Tier 3 (Director) Workflow
- Department Head (Tier 2) Dashboard:
  - Scoped queue for all departmental courses and forwarded complaints.
  - Review prior coordinator actions and timeline.
  - Action panel: Request clarification, add HoD remarks, resolve at departmental level, or forward to Director.
- Director SBS (Tier 3) Dashboard:
  - School-wide overview across all SBS departments.
  - Escalated complaints queue.
  - Final adjudication panel: issue executive findings, final institutional resolution or formal dismissal.

### Phase 6: Document Request Loop, Protected Streaming & Timeline History
- Student response portal:
  - Banner notification for grievances in `AWAITING_STUDENT_INFO`.
  - Document upload interface for requested clarifications.
  - Automatic status transition back to `UNDER_REVIEW`.
- Public vs. Private Timeline rendering:
  - Student view: Milestones and public remarks only.
  - Staff view: Complete history including internal faculty deliberations.
- Authenticated Document Proxy (`/api/complaints/[id]/documents/[docId]/download`):
  - Enforces role/ownership checks before streaming bytes.

### Phase 7: Accessibility, Security Hardening, Verification & Deployment
- Accessibility audit:
  - Screen reader navigation with NVDA / VoiceOver.
  - Color contrast check (WCAG 2.1 AA $\ge 4.5:1$).
  - Full keyboard trap and focus ring verification.
- Security audit:
  - Horizontal privilege escalation test (IDOR checks on grievances and documents).
  - Cross-department data leakage test.
  - Input fuzzing on description and subject fields.
- Production deployment configuration:
  - Neon PostgreSQL connection pooling setup.
  - Healthcheck endpoint (`/api/health`).

---

## 3. Testing Strategy

| Test Level | Scope | Tools | Success Criteria |
| :--- | :--- | :--- | :--- |
| **Unit Testing** | Validation schemas, MIME checkers, tracking ID generator | Vitest / Jest | 100% pass on boundary tests and edge cases. |
| **Integration Testing** | Prisma state machine transitions & audit log atomicity | Vitest + Neon Test DB | All transitions correctly update state and log timeline atomically in `$transaction`. |
| **RBAC / Security Testing** | Tenancy and authorization boundary checks | Playwright / Node API test runner | Zero cross-department access; coordinators cannot view unauthorized courses. |
| **End-to-End Testing** | Full lifecycle: Student lodge $\rightarrow$ CC review $\rightarrow$ HoD forward $\rightarrow$ Director resolve | Playwright | Seamless workflow from student filing to final resolution slip download. |
| **Accessibility Testing** | WCAG 2.1 AA Compliance | axe-core + Lighthouse | 0 automated violations on critical user journeys. |

---

## 4. Quality Gates & Exit Criteria

1. **Gate 1 (Security & Tenancy)**: No user can view or alter a grievance or document outside their authorized role and assigned course/department.
2. **Gate 2 (Audit Immutability)**: Every state transition and remark generates an immutable, non-deletable record in `GrievanceTimelineAction`.
3. **Gate 3 (Zero AI)**: 100% of triage, forwarding, and resolutions are human-driven.
4. **Gate 4 (Accessibility)**: All forms, tables, and modal dialogues are fully navigable via keyboard with visible focus and appropriate ARIA attributes.
