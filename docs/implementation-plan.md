# SAMVAD Master Implementation & Delivery Plan
**School of Basic Sciences, CSJMU Kanpur**  
*Document Version: 2.0 (Master Phased Roadmap)*  

---

## 1. Phased Delivery Roadmap Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 0: Master Audit & Specification Alignment (COMPLETED)            │
│ Audit repo, align docs, verify live Neon DB, execute test suites       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Academic Master Data Management (Admin Panel)                 │
│ Departments & Courses CRUD, Active/Inactive Toggles, Dynamic Query APIs│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Authority Account Provisioning & Routing Configuration        │
│ Provision CC/HoD/Director, Course/Dept Assignments, Credential Resets  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Student Grievance Lodging & Secure Document Upload Pipeline   │
│ Dynamic DB Dropdowns, Magic-Byte File Validation, Tracking Tokens      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4: Tier 1 (Course Coordinator) Queue & Review Actions            │
│ Scoped Course Queues, Review State, Document Requests, Forwarding, Res.│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 5: Tier 2 (HoD) & Tier 3 (Director) Escalation & Resolution      │
│ Department Queue, SBS Appellate Queue, HoD/Director Actions & Dismissal│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 6: Student Clarification Loop & Public Tracking Desk             │
│ Respond to Doc Requests with Uploads, Public Tracking Token Lookup     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 7: System Monitoring, Audit Inspection & Final Production Polish │
│ Admin Oversight, Audit Log Viewer, End-to-End Workflow Verification   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Phase Specifications & Acceptance Criteria

### Phase 0: Master Audit & Specification Alignment (Completed)
- **Objective**: Conduct comprehensive source code inspection, verify Prisma configuration and migrations against live Neon PostgreSQL, align documentation, execute test suites, and establish production baselines.
- **Deliverables**: Updated `docs/requirements.md`, `docs/architecture.md`, `docs/data-model.md`, `docs/permissions-matrix.md`, `docs/implementation-plan.md`, `docs/decisions-needed.md`, `docs/security-audit.md`, `docs/deployment-readiness.md`.
- **Status**: **Completed & Verified**.

---

### Phase 1: Academic Master Data Management (Admin Panel)
- **Objective**: Implement the dynamic academic structure in the database and Admin Panel. Enable `SYSTEM_ADMIN` to manage departments and courses without code changes.
- **Dependencies**: Phase 0.
- **Scope & Implementation Tasks**:
  1. **Server Actions / API**:
     - `createDepartmentAction(name, code, description)`
     - `updateDepartmentAction(id, name, description, isActive)`
     - `createCourseAction(departmentId, name, code, programType)`
     - `updateCourseAction(id, name, code, programType, isActive)`
     - Public/authenticated read queries for active departments and courses.
  2. **Admin UI (`/admin/departments`, `/admin/courses`)**:
     - Department list table with Active/Inactive badge and status toggle modal.
     - Add/Edit Department modal form with validation.
     - Course list table grouped or filtered by department with Active/Inactive toggle.
     - Add/Edit Course modal form with parent department selector.
  3. **Audit Logging**:
     - Every department and course creation/edit logged to `SystemAuditLog`.
  4. **Dynamic Landing Page (`src/app/page.tsx`)**:
     - Replace hardcoded department array with live query from `prisma.department.findMany({ where: { isActive: true }, include: { courses: { where: { isActive: true } } } })`.
- **Automated Tests (`tests/admin-master-data.test.ts`)**:
  - Test department creation, duplicate code rejection, and active status toggle.
  - Test course creation under department, duplicate code per department rejection.
  - Test non-admin rejection (Student/Coordinator cannot mutate departments or courses).
  - Test audit log record generation upon master data changes.
- **Acceptance Criteria**:
  - [x] System Admin can create a new department and view it in the department table.
  - [x] Deactivating a department hides it from student-facing registration and lodging forms without deleting database records.
  - [x] System Admin can create courses under any active department.
  - [x] Homepage dynamically displays all active departments and courses from the database.
  - [x] Non-admin roles receive HTTP 403 when attempting master data mutations.

---

### Phase 2: Authority Account Provisioning & Routing Configuration
- **Objective**: Enable `SYSTEM_ADMIN` to provision staff accounts (`COURSE_COORDINATOR`, `DEPARTMENT_HEAD`, `DIRECTOR`), map them to courses/departments, and configure grievance routing.
- **Dependencies**: Phase 1.
- **Scope & Implementation Tasks**:
  1. **Server Actions / APIs**:
     - `provisionStaffUserAction(email, fullName, role, phoneNumber)`
     - `assignStaffAuthorityAction(userId, role, departmentId, courseId)`
     - `unassignStaffAuthorityAction(assignmentId)`
     - `toggleUserStatusAction(userId, isActive)`
     - `adminResetStaffPasswordAction(userId)`
  2. **Admin UI (`/admin/staff`, `/admin/routing`)**:
     - Staff accounts table showing role, active assignments, status, and actions.
     - "Provision Staff Account" modal generating secure temporary password with `mustResetPassword = true`.
     - "Assign Authority" modal:
       - For `COURSE_COORDINATOR`: select department, then select specific course(s).
       - For `DEPARTMENT_HEAD`: select department.
       - For `DIRECTOR`: assign as active Director for SBS.
     - Authority Routing Matrix view showing which official oversees each course and department.
     - "Deactivate Account" and "Reset Password" action buttons with immediate session revocation (`revokeAllUserSessions`).
  3. **Staff First-Login Reset Flow**:
     - Intercept staff login when `mustResetPassword === true` and redirect to `/reset-password` form.
- **Automated Tests (`tests/admin-staff-routing.test.ts`)**:
  - Test staff account provisioning with restricted roles.
  - Test assignment creation for Coordinators and HoDs.
  - Test authority reassignment: verify old assignment has `isActive = false`, new assignment is active.
  - Test staff account deactivation immediately revokes active sessions and blocks access.
  - Test that students cannot be assigned coordinator or HoD roles.
- **Acceptance Criteria**:
  - [x] Admin can provision a Coordinator and assign them to an active course.
  - [x] Admin can map a Department Head to an active department.
  - [x] Admin can designate the active Director for SBS.
  - [x] Deactivating a staff account immediately invalidates their active sessions and blocks portal access.
  - [x] Reassigning a course coordinator preserves past assignment records for audit integrity.

---

### Phase 3: Student Grievance Lodging & Secure Document Upload Pipeline
- **Objective**: Build the student grievance lodging workflow with dynamic database dropdowns, form validation, secure file ingestion, and tracking number generation.
- **Dependencies**: Phase 1.
- **Scope & Implementation Tasks**:
  1. **Lodging Form UI (`/student/lodge` or modal on `/student`)**:
     - Dynamic Department select (queried from active DB departments).
     - Cascading Course select (filtered by chosen department).
     - Category select (`ACADEMIC`, `EXAMINATION`, `LABORATORY`, `ADMINISTRATIVE`, `FACULTY_MENTORSHIP`, `OTHER`).
     - Subject input (max 150 chars) and Description textarea (min 50 chars, max 3000 chars).
     - Relief Sought textarea (max 500 chars).
     - File upload zone supporting up to 3 attachments (PDF, PNG, JPEG, $\le 5\text{MB}$ each).
  2. **Lodging Server Action (`lodgeGrievanceAction`)**:
     - Verify authenticated user role is `STUDENT`.
     - Validate fields with Zod.
     - Process uploaded files: verify MIME type, inspect magic bytes, compute SHA-256 hash, save to protected private storage.
     - Generate sequential tracking number: `CSJMU-SBS-YYYY-[DEPT]-[SEQ]`.
     - In atomic `$transaction`:
       - Create `Grievance` row.
       - Create `GrievanceDocument` row(s).
       - Create initial `GrievanceTimelineAction` row (`actionType = SUBMITTED`, `visibility = PUBLIC_TO_STUDENT`).
  3. **Confirmation View**:
     - Display generated tracking number with copy button and printable receipt.
- **Automated Tests (`tests/grievance-lodging.test.ts`)**:
  - Test grievance creation with valid payload and files in live database.
  - Test validation errors: short description, invalid course ID, wrong file type rejected.
  - Test magic-byte validation rejecting disguised executables (`.exe` renamed to `.pdf`).
  - Test initial timeline event creation and tracking number format.
- **Acceptance Criteria**:
  - [x] Authenticated student can lodge a grievance for an active course in their department.
  - [x] Form dynamically populates departments and courses from the database.
  - [x] Uploaded documents are verified for magic bytes and SHA-256 hashes are recorded.
  - [x] System generates a unique tracking number and an initial audit timeline record.
  - [x] Unauthenticated callers or staff roles cannot lodge student grievances.

---

### Phase 4: Tier 1 (Course Coordinator) Queue & Workflow Actions
- **Objective**: Build the Course Coordinator workspace, scoped queue, grievance evaluation interface, document requests, internal remarks, forwarding, and Tier 1 resolution.
- **Dependencies**: Phase 2, Phase 3.
- **Scope & Implementation Tasks**:
  1. **Coordinator Queue (`/coordinator`)**:
     - Query grievances strictly matching coordinator's active course assignments:
       `WHERE courseId IN (SELECT courseId FROM StaffAssignment WHERE userId = :id AND isActive = true)`.
     - Queue table displaying Tracking Number, Student Name, Roll Number, Subject, Category, Status, Submitted Date, and Action button.
  2. **Grievance Detail & Action Modal (`/coordinator/grievance/[id]`)**:
     - View student details, full complaint description, relief sought, and attachments.
     - Chronological timeline history (dual-track: public + internal remarks).
     - **Action 1: Mark Under Review**: Updates status to `UNDER_REVIEW`, logs timeline event.
     - **Action 2: Add Internal Faculty Remark**: Adds internal remark (`visibility = INTERNAL_STAFF_ONLY`).
     - **Action 3: Request Supplementary Documents**: Creates `DocumentRequest` row, sets status `AWAITING_STUDENT_INFO`, logs public timeline event.
     - **Action 4: Forward to Department Head (Tier 1 $\rightarrow$ Tier 2)**: Mandatory forwarding justification, sets status `FORWARDED`, advances `currentTier = TIER_2_HOD`, logs timeline event.
     - **Action 5: Resolve Grievance (Tier 1)**: Enters official resolution findings, sets status `RESOLVED`, records `resolvedAt = now()`.
- **Automated Tests (`tests/tier1-coordinator.test.ts`)**:
  - Test queue isolation: Coordinator only sees grievances for their assigned courses; cannot see grievances from other courses.
  - Test action: Mark under review, add internal remark.
  - Test action: Issue document request, verify status changes to `AWAITING_STUDENT_INFO`.
  - Test action: Forward to HoD, verify tier advances to `TIER_2_HOD`.
  - Test action: Resolve at Tier 1, verify status becomes `RESOLVED`.
- **Acceptance Criteria**:
  - [x] Coordinator sees all and only grievances matching their active course assignments.
  - [x] Coordinator can add internal faculty remarks hidden from student view.
  - [x] Coordinator can issue formal document requests.
  - [x] Coordinator can forward grievances to HoD with mandatory remarks.
  - [x] Coordinator can formally resolve course-level grievances.

---

### Phase 5: Tier 2 (HoD) & Tier 3 (Director) Escalation & Resolution Engines
- **Objective**: Build Department Head (Tier 2) and Director (Tier 3) consoles, escalation queues, document request loops, forwarding, and final institutional resolution/dismissal.
- **Dependencies**: Phase 4.
- **Scope & Implementation Tasks**:
  1. **Department Head Console (`/department-head`)**:
     - Scoped queue: All grievances belonging to HoD's assigned department where `currentTier = TIER_2_HOD` or department-wide issues.
     - Review prior coordinator remarks and actions.
     - Actions: Mark Under Review, Add Internal Remark, Request Documents, Forward to Director SBS (`TIER_3_DIRECTOR`), Resolve at Department Level, or Dismiss Grievance with stated grounds.
  2. **Director SBS Appellate Console (`/director`)**:
     - School-wide queue: All grievances escalated to `TIER_3_DIRECTOR` across all SBS departments.
     - Review complete history across Tier 1 and Tier 2.
     - Actions: Mark Under Review, Add Directorate Directive, Request Documents, Record Final Institutional Resolution, or Dismiss Grievance with stated grounds.
  3. **Dismissal Logic**:
     - Requires formal selection of standardized grounds (`OUT_OF_JURISDICTION`, `INSUFFICIENT_EVIDENCE`, `DUPLICATE_SUBMISSION`, `OTHER`) plus mandatory written explanation. Sets status `DISMISSED`.
- **Automated Tests (`tests/tier2-tier3-escalation.test.ts`)**:
  - Test HoD queue isolation: HoD only sees complaints from their department; cannot see other departments.
  - Test HoD escalation to Director: advances tier to `TIER_3_DIRECTOR`.
  - Test Director queue: sees escalated complaints across departments.
  - Test HoD and Director resolution and dismissal actions.
- **Acceptance Criteria**:
  - [x] HoD can review escalated grievances from course coordinators within their department.
  - [x] HoD can forward complex cases to Director SBS with written justification.
  - [x] Director can review all escalated grievances across the School of Basic Sciences.
  - [x] Both HoD and Director can formally resolve or dismiss grievances with recorded findings.
  - [x] All state transitions strictly enforce the authorization and transition matrix.

---

### Phase 6: Student Clarification Loop & Public Tracking Desk
- **Objective**: Implement student document response workflow, protected document download streaming, and public tracking lookup.
- **Dependencies**: Phase 4, Phase 5.
- **Scope & Implementation Tasks**:
  1. **Student Dashboard Updates (`/student`)**:
     - Pending Document Requests banner showing officer instructions and deadline.
     - "Respond & Upload Documents" modal: file uploader attaching proof to pending `DocumentRequest`.
     - Mutation updates `DocumentRequest.status = FULFILLED` and grievance `currentStatus = UNDER_REVIEW`.
     - My Grievances list with status badges and detail link.
  2. **Protected Document Streaming Route (`GET /api/documents/[id]`)**:
     - Reads document metadata from database.
     - Verifies caller authorization:
       - If caller is student: must match `grievance.studentId === caller.id`.
       - If caller is coordinator: must have active `StaffAssignment` for grievance's course.
       - If caller is HoD: must have active `StaffAssignment` for grievance's department.
       - If caller is Director: authorized for all SBS.
       - All other callers (including anonymous or unrelated staff) denied with HTTP 403.
     - Streams file bytes with safe `Content-Disposition` and `Content-Type` headers.
  3. **Public Tracking Desk (`/track`)**:
     - Replaces demo timeline with live database lookup by `trackingNumber`.
     - Displays public milestones (`visibility = PUBLIC_TO_STUDENT`).
     - Strictly hides student name, student email, student phone, internal staff remarks, and document download links.
- **Automated Tests (`tests/student-clarification-tracking.test.ts`)**:
  - Test student uploading requested document: status transitions from `AWAITING_STUDENT_INFO` back to `UNDER_REVIEW`.
  - Test protected document streaming: student owner can download; unauthorized student receives 403; coordinator of another course receives 403.
  - Test public tracking desk: valid token returns public timeline; student personal data and internal remarks are excluded.
- **Acceptance Criteria**:
  - [ ] Student can view official document requests and upload supplementary proofs to fulfill them.
  - [ ] Uploaded documents are streamed exclusively to authorized users; unauthorized downloads are rejected.
  - [ ] Anyone can track grievance progress using a valid tracking number without revealing confidential student identity or internal remarks.

---

### Phase 7: System Monitoring, Audit Inspection & Final Production Polish
- **Objective**: Complete Admin grievance oversight (read-only monitoring without dispute adjudication), administrative audit log inspection, distributed rate limiting readiness, and end-to-end verification.
- **Dependencies**: Phase 6.
- **Scope & Implementation Tasks**:
  1. **Admin Grievance Monitoring (`/admin/grievances`)**:
     - High-level overview: Total grievances, counts by tier (Tier 1, Tier 2, Tier 3), counts by status (`SUBMITTED`, `UNDER_REVIEW`, `RESOLVED`, `DISMISSED`).
     - Read-only table showing Tracking ID, Department, Course, Tier, Status, Lodged Date.
     - Strictly no access to grievance merits, student text, or evidence attachments (preserving confidentiality).
  2. **Admin System Audit Log Viewer (`/admin/audit`)**:
     - Searchable table displaying `SystemAuditLog` entries: Timestamp, Admin Email, Action, Target Model, Target ID, and State Diff.
  3. **Distributed Rate Limiting Infrastructure**:
     - Provide Upstash Redis distributed rate limiter implementation with fallback to in-memory store.
  4. **End-to-End Regression Test Suite (`tests/e2e-workflow.test.ts`)**:
     - Full automated workflow: Student registers $\rightarrow$ Lodges grievance $\rightarrow$ Coordinator reviews and requests docs $\rightarrow$ Student uploads proof $\rightarrow$ Coordinator forwards to HoD $\rightarrow$ HoD forwards to Director $\rightarrow$ Director resolves $\rightarrow$ Student views resolution.
- **Automated Tests**:
  - Full end-to-end multi-tier lifecycle test.
  - Complete regression run: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- **Acceptance Criteria**:
  - [ ] System Admin can monitor school-wide grievance statistics and inspect system audit logs.
  - [ ] End-to-end grievance workflow executes from student lodging to director resolution with zero errors.
  - [ ] All 35+ automated tests pass, zero type errors, zero lint warnings, production build clean.
