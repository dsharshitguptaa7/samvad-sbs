# SAMVAD Requirements Specification
**Grievance Redressal Portal for School of Basic Sciences (SBS)**  
**Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur**

---

## 1. Executive Summary & Objectives

**SAMVAD** (*Dialogue & Redressal*) is a dedicated, role-based, manual Grievance Redressal Portal engineered specifically for the **School of Basic Sciences (SBS)** at **Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur**.

### Core Objectives
1. **Streamlined Grievance Lodging**: Provide students across all basic science departments a transparent, auditable, and user-friendly digital mechanism to lodge course-specific grievances along with verified evidentiary documents.
2. **Deterministic Human Hierarchy**: Enforce a strict multi-tiered review and redressal pipeline:
   $$\text{Course Coordinator (Tier 1)} \longrightarrow \text{Department Head (Tier 2)} \longrightarrow \text{Director (Tier 3)}$$
3. **Accountability & Complete Audit Trail**: Maintain an immutable, append-only chronological history of every transition, remark, document request, forwarding action, and resolution.
4. **Zero Automated / Black-box Decision Making**: Explicitly reject AI or algorithmic filtering; every grievance is reviewed and acted upon strictly by authorized faculty and administrative officials.
5. **Secure & Accessible Experience**: Ensure strict privacy of student grievances, authenticated file storage with authorization gates, and conformance to WCAG 2.1 AA accessibility standards.

---

## 2. Institutional Context & Scope

### 2.1 Institution
- **University**: Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur, Uttar Pradesh, India.
- **Academic Unit**: School of Basic Sciences (SBS).

### 2.2 Departmental Scope
The system will launch with initial support for the following academic units, with extensible configuration managed dynamically by the System Administrator:
1. **Department of Mathematics**
2. **Department of Physics**
3. **Department of Chemistry**
4. **Department of Geography**
5. **Department of Environmental Sciences**  
   *(Note: Configurable as distinct departments or a combined department based on CSJMU statute; see `docs/decisions-needed.md`)*.

---

## 3. Stakeholders & User Roles

| Role | Scope | Primary Responsibilities |
| :--- | :--- | :--- |
| **Student** | Personal submissions | Submit grievances against enrolled course, attach supporting documents, track real-time status and timeline history, submit additional documents upon official request, download formal resolution slips. |
| **Course Coordinator (CC)** | Assigned Course(s) | Review incoming grievances for their specific courses, request additional proof/documents from students, add internal faculty remarks, resolve issues at course level, or formally forward to Department Head with notes. |
| **Department Head (HoD)** | Assigned Department | Review escalated grievances or department-wide complaints, review prior coordinator actions, add departmental remarks, request clarification, resolve complaints, or escalate to the School Director. |
| **Director, School of Basic Sciences** | Entire SBS School | Highest appellate authority within SBS. Review grievances escalated by HoDs or institutional-level grievances, conduct final hearings/inquiries, add directorate directives, and record final institutional resolution. |
| **System Administrator** | Portal Configuration | Manage academic master data (departments, courses, academic sessions), onboard staff, assign roles and departmental/course mappings, execute secure staff credential resets, inspect system audit logs. **Zero involvement in grievance evaluation or dispute resolution.** |

---

## 4. Functional Requirements

### 4.1 Authentication & Profile Management
- **FR-AUTH-01**: Secure role-based authentication using encrypted credentials (Argon2id/bcrypt) with secure HTTP-only session cookies.
- **FR-AUTH-02**: Student registration capturing verified details: Full Name, Roll Number / Enrollment Number, Institutional / Contact Email, Mobile Number, Department, Program, and Enrolled Semester/Year.
- **FR-AUTH-03**: Faculty and Officer accounts (Coordinator, HoD, Director) are provisioned exclusively by the System Admin with pre-assigned institutional roles.
- **FR-AUTH-04**: Administrative credential reset workflow with forced password reset on first login for staff.
- **FR-AUTH-05**: Strict session invalidation upon logout and automated idle timeout.

### 4.2 Academic Master Data Management (Admin)
- **FR-MDM-01**: CRUD management of Departments with status toggling (Active / Inactive).
- **FR-MDM-02**: CRUD management of Courses/Programs linked directly to parent departments.
- **FR-MDM-03**: Role mapping:
  - Course Coordinator $\rightarrow$ 1 or more specific Courses within a Department.
  - Department Head $\rightarrow$ Exactly 1 Department.
  - Director $\rightarrow$ Entire School of Basic Sciences.
- **FR-MDM-04**: Support for tenure / term re-assignment without breaking historical audit trails of past grievances.

### 4.3 Grievance Submission & Document Attachment (Student)
- **FR-SUB-01**: Unique Tracking ID generation following format: `CSJMU-SBS-YYYY-[DEPT_CODE]-[RANDOM/SEQ]` (e.g., `CSJMU-SBS-2026-MATH-0142`).
- **FR-SUB-02**: Mandatory fields:
  - Department (selected from active SBS departments)
  - Course / Program (dynamically filtered by selected department)
  - Grievance Category (Academic / Curriculum, Internal Assessment / Examination, Laboratory / Facilities, Administrative / Fee, Faculty / Mentorship, General)
  - Grievance Subject (Max 150 chars)
  - Detailed Description (Rich text sanitized or multi-line plain text, min 50 chars, max 3000 chars)
  - Relief / Remedy Sought (Max 500 chars)
  - Evidentiary Attachments (Optional at lodging, max 3 files, 5MB each, PDF / PNG / JPEG)
- **FR-SUB-03**: Submission Confirmation with instant tracking token, printable summary, and automated email confirmation (if SMTP configured).

### 4.4 Multi-Tier Redressal Workflow

```
[Student Lodges Complaint]
           │
           ▼
[Tier 1: Course Coordinator] ──(Request Documents)──► [Student Responds]
     │                 │
 (Resolved)    (Forward to HoD)
                       │
                       ▼
            [Tier 2: Department Head] ──(Request Documents)──► [Student Responds]
                 │                 │
             (Resolved)    (Forward to Director)
                                   │
                                   ▼
                         [Tier 3: Director SBS] ──(Request Documents)──► [Student Responds]
                                   │
                               (Resolved)
```

- **FR-WKF-01**: **Tier 1 (Course Coordinator)**:
  - Default entry point for course-linked grievances.
  - Coordinator can:
    1. Mark Under Review.
    2. Add Internal Remark (visible only to faculty/admin).
    3. Issue Document Clarification Request to Student (pauses resolution clock, sets status to `AWAITING_STUDENT_INFO`).
    4. Resolve Grievance with official resolution remarks.
    5. Forward to Department Head with justification.
- **FR-WKF-02**: **Tier 2 (Department Head)**:
  - Receives forwarded grievances from CC or direct department-level complaints.
  - Can review all prior remarks and documents.
  - Can request additional student documentation.
  - Can resolve grievance.
  - Can forward to Director SBS with formal recommendation.
- **FR-WKF-03**: **Tier 3 (Director SBS)**:
  - Receives escalated grievances from HoD.
  - Can conduct review hearings, add executive directives, request documentation.
  - Issues final institutional resolution or dismissal with recorded statutory reasons.
- **FR-WKF-04**: Redressal Remark Types:
  - **Public / Student Remarks**: Disclosed immediately on the student's status tracking view.
  - **Internal Review Notes**: Retained exclusively for staff review across tiers; never exposed to student.

### 4.5 Document Clarification Loop
- **FR-DOC-01**: Authorized officer at the current active tier can issue a formal Document Request specifying exact requirements and an optional response deadline.
- **FR-DOC-02**: Student receives prominent dashboard notification and can upload requested supplementary documents.
- **FR-DOC-03**: Student uploads automatically advance status from `AWAITING_STUDENT_INFO` back to `UNDER_REVIEW` at the requesting tier.

### 4.6 Grievance Tracking & Audit History
- **FR-TRK-01**: Public / Student Timeline displaying milestone events: Submitted, Assigned, Under Review, Clarification Requested, Clarification Provided, Forwarded, Resolved.
- **FR-TRK-02**: Granular Staff Audit Log recording: Exact Timestamp, Actor ID, Actor Role, Source Tier, Destination Tier, Action Name, Internal Remarks, Affected File IDs, Client IP Address.
- **FR-TRK-03**: System Audit Log recording administrative events: User Created, Role Modified, Department Added, Password Reset.

---

## 5. Non-Functional Requirements (NFR)

### 5.1 Security & Data Integrity
- **NFR-SEC-01**: Zero unauthorized horizontal access: Students can only view their own grievances.
- **NFR-SEC-02**: Zero unauthorized departmental crossover: Course Coordinators and HoDs cannot view grievances from outside their assigned department.
- **NFR-SEC-03**: File security: Uploaded documents must never be publicly accessible via static web paths. Access strictly via pre-signed temporary URLs or authenticated streaming route with role validation.
- **NFR-SEC-04**: Upload validation: Strict validation of file size, magic-byte MIME type inspection (blocking executables, scripts, SVGs with embedded scripts).

### 5.2 Accessibility & Usability (WCAG 2.1 AA)
- **NFR-A11Y-01**: Semantic HTML5 elements (`<main>`, `<nav>`, `<article>`, `<header>`, `<section>`).
- **NFR-A11Y-02**: Minimum color contrast ratio of 4.5:1 for normal text and 3:1 for large text / UI controls.
- **NFR-A11Y-03**: Complete keyboard navigability with visible focus rings and screen reader support (`aria-live`, `aria-describedby`, descriptive labels).
- **NFR-A11Y-04**: Responsive design functioning seamlessly across mobile phones (360px+), tablets, and desktop workstations.

### 5.3 Performance & Reliability
- **NFR-PERF-01**: Server response time $<300\text{ms}$ for standard dashboard queries.
- **NFR-PERF-02**: Neon PostgreSQL connection pooling via connection pooling proxy (pgBouncer / Prisma Accelerate) to prevent connection starvation in serverless execution.
- **NFR-PERF-03**: Atomic database transactions (`$transaction`) for multi-table updates (e.g. changing status + creating timeline entry + notifying).

---

## 6. Out-of-Scope Declarations
- ❌ **No Artificial Intelligence, Machine Learning, or Automated Triage**: No auto-categorization, no sentiment scoring, no bot auto-responses.
- ❌ **No Automated Escalation Timers (Without Prior University Approval)**: Status escalations are strictly performed by human officials unless CSJMU policy specifically mandates cron-based auto-escalation.
- ❌ **No Direct Payment Processing**: Grievance lodging is completely free of charge.
