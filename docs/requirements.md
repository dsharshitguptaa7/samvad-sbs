# SAMVAD Requirements Specification
**Grievance Redressal Portal for School of Basic Sciences (SBS)**  
**Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur**  
*Document Version: 2.0 (Master Production Specification)*  

---

## 1. Executive Summary & Core Objectives

**SAMVAD** (*Dialogue & Redressal*) is an official, role-based, manual Grievance Redressal Portal engineered specifically for the **School of Basic Sciences (SBS)** at **Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur**.

The primary objective is to deliver a production-conscious application in which the **System Administrator** controls the academic structure, authority accounts, staff assignments, and grievance routing through a centralized Admin Panel. Routine academic or staff configuration must never require code changes or redeployments.

### Core Objectives
1. **Dynamic Academic Structure**: Departments and courses are stored in the database as the sole source of truth. No department or course IDs are hardcoded in application logic.
2. **Centralized Administrative Authority Control**: A single privileged `SYSTEM_ADMIN` role provisions faculty/officer accounts, manages assignments, configures the active Director account, and oversees portal operation without having adjudication powers over grievance merits.
3. **Deterministic Human Hierarchy**: Enforces a strict multi-tiered review and redressal pipeline:
   $$\text{Student} \longrightarrow \text{Course Coordinator (Tier 1)} \longrightarrow \text{Department Head (Tier 2)} \longrightarrow \text{Director (Tier 3)}$$
4. **Complete Accountability & Audit Trail**: Maintains an immutable, append-only chronological history of every transition, remark, document request, forwarding action, and resolution.
5. **Zero Automated / AI Decisions**: Explicitly rejects AI classification, AI filtering, or automated resolution. Every grievance is adjudicated strictly by designated human officials.
6. **Data Confidentiality & Non-Destructive Integrity**: Protects student records, passwords, session tokens, and documents. When staff, courses, or departments are deactivated, historical grievance records and assignment snapshots are preserved.

---

## 2. Institutional Context & Scope

### 2.1 Institution
- **University**: Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur, Uttar Pradesh, India.
- **Academic Unit**: School of Basic Sciences (SBS).

### 2.2 Departmental Scope
The portal launches with dynamic support for all basic science academic units, initially including:
1. **Department of Mathematics** (`MATH`)
2. **Department of Physics** (`PHYS`)
3. **Department of Chemistry** (`CHEM`)
4. **Department of Geography** (`GEOG`)
5. **Department of Environmental Sciences** (`ENVS`)

All academic units and courses are managed via the database and Admin Panel. Additional departments can be added at any time by the System Administrator.

---

## 3. Stakeholders & User Roles

| Role Code | Role Title | Operational Scope | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| `STUDENT` | Student | Personal submissions | Self-registers; lodges grievances for their enrolled course; uploads evidentiary documents; tracks real-time progress via timeline; responds to formal document requests; downloads resolution summaries. |
| `COURSE_COORDINATOR` | Course Coordinator (Tier 1) | Assigned course(s) | Reviews incoming grievances for assigned courses; requests supplementary proofs; adds internal review remarks; resolves course-level grievances; forwards unresolved cases to HoD. |
| `DEPARTMENT_HEAD` | Department Head / HoD (Tier 2) | Assigned department | Oversees all courses and grievances within their department; reviews coordinator findings; requests additional documents; resolves department-level grievances; forwards complex/appellate cases to Director. |
| `DIRECTOR` | Director, School of Basic Sciences (Tier 3) | Entire SBS School | Highest appellate authority within SBS; conducts executive review of escalated grievances; issues directorate directives; requests documents; records final institutional resolution or dismissal. |
| `SYSTEM_ADMIN` | System Administrator | Master portal configuration | Manages academic master data (departments, courses); provisions staff accounts; assigns faculty to courses/departments; sets the active Director; executes credential resets; inspects system audit logs. **Zero involvement in grievance evaluation or dispute resolution.** |

---

## 4. Functional Requirements

### 4.1 Master Administrative Management (Admin Panel)
- **FR-ADM-01 (Department Management)**: System Admin can create, edit name/description, and activate/deactivate departments.
- **FR-ADM-02 (Course Management)**: System Admin can create, edit, activate/deactivate courses, and associate them with active departments.
- **FR-ADM-03 (Staff Provisioning)**: System Admin can create faculty and officer accounts (`COURSE_COORDINATOR`, `DEPARTMENT_HEAD`, `DIRECTOR`) with temporary credentials and forced password reset flags (`mustResetPassword = true`).
- **FR-ADM-04 (Authority Assignments & Grievance Routing)**:
  - Assign Course Coordinator(s) to 1 or more specific courses.
  - Map Department Head(s) to exactly 1 department.
  - Designate the active Director for the School of Basic Sciences.
  - Reassign authority roles with active tenure flags (`isActive`, `assignedAt`, `unassignedAt`), preserving historical assignment links on past grievances.
- **FR-ADM-05 (Staff Account Management & Credential Reset)**: Activate/deactivate staff accounts and trigger administrative password resets without revealing passwords.
- **FR-ADM-06 (System Audit Logs)**: View immutable administrative audit trail capturing who modified departments, courses, staff accounts, or mappings, with timestamp, actor ID, and IP address.

### 4.2 Authentication & Profile Security
- **FR-AUTH-01 (Role Privilege Isolation)**: Public self-registration is strictly restricted to the `STUDENT` role. Any submitted role parameter is stripped on the server.
- **FR-AUTH-02 (Student Registration)**: Captures verified student data: Full Name, Roll Number, Enrollment Number, Department, Course, Email, Phone Number, Password.
- **FR-AUTH-03 (Password Security)**: Passwords hashed using bcrypt with 12 salt rounds; constant-time dummy verification executed on non-existent user lookups to prevent user enumeration.
- **FR-AUTH-04 (Session Management)**: Cryptographically random 256-bit session tokens stored as SHA-256 digests in database; transmitted via `HttpOnly`, `SameSite=Lax`, `Secure` cookies with 8-hour expiration.
- **FR-AUTH-05 (Multi-Session Invalidation)**: Administrative deactivation or password reset immediately invalidates all active sessions across all devices for the target user.
- **FR-AUTH-06 (Server-Side Authorization)**: Every protected page, API route handler, and Server Action verifies authorization on the server via session validation and role guards.

### 4.3 Student Grievance Filing & Document Pipeline
- **FR-GRV-01 (Tracking Number Generation)**: Unique tracking number following the standard: `CSJMU-SBS-YYYY-[DEPT_CODE]-[SEQ]` (e.g. `CSJMU-SBS-2026-MATH-0142`).
- **FR-GRV-02 (Dynamic Selection)**: Department and course dropdowns populated exclusively from active database records.
- **FR-GRV-03 (Grievance Form Fields)**:
  - Department (Active SBS Department)
  - Course (Active Course in Department)
  - Category (`ACADEMIC`, `EXAMINATION`, `LABORATORY`, `ADMINISTRATIVE`, `FACULTY_MENTORSHIP`, `OTHER`)
  - Subject (Max 150 chars)
  - Description (Min 50 chars, max 3000 chars)
  - Relief Sought (Max 500 chars)
  - Evidentiary Attachments (Optional at lodging, max 3 files, $\le 5\text{MB}$ each, PDF / PNG / JPEG)
- **FR-GRV-04 (Secure Document Ingestion)**: MIME verification, magic-byte inspection, SHA-256 checksum calculation, storage under non-public storage keys.

### 4.4 Multi-Tier Redressal Workflow & Grievance Actions
- **FR-FLOW-01 (Tier 1 - Course Coordinator)**:
  - Scoped queue: Coordinator sees only grievances for assigned courses.
  - Review: Mark grievance `UNDER_REVIEW`.
  - Document Request: Request specific clarification or proof from student with instructions and optional deadline.
  - Remarks: Add internal faculty remarks (visible only to staff).
  - Forward: Escalate to Tier 2 (HoD) with mandatory forwarding justification.
  - Resolve: Formally resolve course-level grievances with official resolution summary.
- **FR-FLOW-02 (Tier 2 - Department Head)**:
  - Scoped queue: HoD sees all grievances within their department (escalated or departmental).
  - Review: Review prior coordinator timeline, actions, and remarks.
  - Document Request: Issue supplementary document request to student.
  - Remarks: Add internal departmental remarks.
  - Forward: Escalate to Tier 3 (Director) with mandatory forwarding justification.
  - Resolve: Formally resolve department-level grievances.
  - Dismiss: Formally dismiss grievances with stated grounds (`OUT_OF_JURISDICTION`, `INSUFFICIENT_EVIDENCE`, `DUPLICATE_SUBMISSION`, `OTHER`).
- **FR-FLOW-03 (Tier 3 - Director SBS)**:
  - School queue: Director sees all escalated grievances across the School of Basic Sciences.
  - Review: Review complete timeline across Tier 1 and Tier 2.
  - Remarks & Directives: Record directorate observations.
  - Document Request: Issue executive document requests.
  - Final Resolution / Dismissal: Record final institutional decision.

### 4.5 Student Clarification Loop & Public Tracking
- **FR-CLR-01 (Document Request Response)**: Student dashboard alerts student to pending document requests; student uploads requested files; status returns to `UNDER_REVIEW`.
- **FR-TRK-01 (Public Tracking)**: Anyone with a valid tracking number can check status, review tier, and public milestones on `/track` without logging in. Student identities, document files, and internal remarks are strictly hidden.
- **FR-DOC-01 (Protected Document Streaming)**: Evidentiary files are never publicly downloadable; streamed exclusively through an authenticated route that verifies user role and tenancy clearance.

---

## 5. Non-Negotiable System Invariants

1. **Human Decision Invariant**: No AI or algorithmic logic shall classify, prioritize, evaluate, or resolve grievances.
2. **Database Authority Invariant**: Hardcoding departments, courses, or authority IDs in source code is strictly prohibited.
3. **Data Preservation Invariant**: Grievance records, timeline events, and uploaded documents must never be hard-deleted or orphaned upon staff reassignment or course deactivation.
4. **Server Boundary Invariant**: Client-side UI controls and edge middleware must always be backed by server-side session and role validation on every query and mutation.
5. **Credential Safety Invariant**: Passwords and session tokens must never be logged, printed, or exposed in client bundles.
