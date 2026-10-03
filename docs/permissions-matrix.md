# SAMVAD Permissions & Access Control Matrix
**School of Basic Sciences, CSJMU Kanpur**

---

## 1. Role Definitions & Scopes

| Role Code | Role Name | Tenancy / Scope Boundary | Description |
| :--- | :--- | :--- | :--- |
| `STUDENT` | Student | **Self / Personal** | Can only interact with grievances filed under their own authenticated account. |
| `COURSE_COORDINATOR` | Course Coordinator (Tier 1) | **Assigned Course(s)** | Faculty assigned by Admin to oversee specific courses within a department. Scoped strictly to those courses. |
| `HOD` | Department Head (Tier 2) | **Assigned Department** | Academic head overseeing all courses and grievances within their assigned academic department. |
| `DIRECTOR` | Director SBS (Tier 3) | **Entire School (SBS)** | Appellate leadership overseeing all departments within the School of Basic Sciences. |
| `ADMIN` | System Administrator | **System Master Data** | Technical administrator managing users, roles, departments, courses, and security configurations. **Zero grievance adjudicating rights.** |

---

## 2. Resource Permissions Matrix

Legend:
- ✅ **ALLOWED**: Granted by default.
- 🟡 **CONDITIONAL**: Allowed only if resource matches the user's assigned scope (own student ID, assigned course ID, assigned department ID).
- ❌ **DENIED**: Strictly forbidden.

### 2.1 Master Data & Administrative Operations

| Operation | Student | Course Coordinator | Department Head | Director | System Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Create / Edit Department | ❌ | ❌ | ❌ | ❌ | ✅ |
| Toggle Department Status (Active/Inactive) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Create / Edit Course | ❌ | ❌ | ❌ | ❌ | ✅ |
| Create Staff Account (Faculty/Officer) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Assign Faculty to Course / Department | ❌ | ❌ | ❌ | ❌ | ✅ |
| Reset Staff Password / Credentials | ❌ | ❌ | ❌ | ❌ | ✅ |
| View System Administrative Audit Logs | ❌ | ❌ | ❌ | ❌ | ✅ |
| Self-register / Update Profile | ✅ (Student) | ❌ | ❌ | ❌ | ❌ |

---

### 2.2 Grievance Access & Visibility

| Operation | Student | Course Coordinator | Department Head | Director | System Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Submit New Grievance | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Grievance Details | 🟡 (Own only) | 🟡 (Assigned courses) | 🟡 (Assigned dept) | ✅ (All SBS) | ❌ (Metadata only)* |
| View Uploaded Supporting Documents | 🟡 (Own only) | 🟡 (Assigned courses) | 🟡 (Assigned dept) | ✅ (All SBS) | ❌ |
| View Public / Student Timeline | ✅ (Own only) | 🟡 (Assigned courses) | 🟡 (Assigned dept) | ✅ (All SBS) | ❌ |
| View Internal Staff Remarks | ❌ | 🟡 (Assigned courses) | 🟡 (Assigned dept) | ✅ (All SBS) | ❌ |
| Export Grievance Summary / PDF | 🟡 (Own only) | 🟡 (Assigned courses) | 🟡 (Assigned dept) | ✅ (All SBS) | ❌ |

*\*Note: System Admin can view aggregate system health counts and technical audit logs, but cannot read student grievance bodies or evidentiary documents to preserve confidentiality.*

---

### 2.3 Grievance Action Permissions

| Action / Workflow Step | Student | Course Coordinator | Department Head | Director | System Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Mark Grievance as Under Review | ❌ | 🟡 (Tier 1) | 🟡 (Tier 2) | 🟡 (Tier 3) | ❌ |
| Add Internal Review Remark | ❌ | 🟡 (Tier 1) | 🟡 (Tier 2) | 🟡 (Tier 3) | ❌ |
| Issue Formal Document Request | ❌ | 🟡 (Tier 1) | 🟡 (Tier 2) | 🟡 (Tier 3) | ❌ |
| Upload Requested Documents | 🟡 (Own pending) | ❌ | ❌ | ❌ | ❌ |
| Forward to Department Head (Tier 1 $\rightarrow$ 2) | ❌ | 🟡 (Assigned courses) | ❌ | ❌ | ❌ |
| Forward to Director SBS (Tier 2 $\rightarrow$ 3) | ❌ | ❌ | 🟡 (Assigned dept) | ❌ | ❌ |
| Resolve Grievance (Tier 1 Course Level) | ❌ | 🟡 (Assigned courses) | ❌ | ❌ | ❌ |
| Resolve Grievance (Tier 2 Dept Level) | ❌ | ❌ | 🟡 (Assigned dept) | ❌ | ❌ |
| Resolve Grievance (Tier 3 Director Level) | ❌ | ❌ | ❌ | ✅ (All SBS) | ❌ |
| Dismiss Grievance (With Stated Grounds) | ❌ | ❌ | 🟡 (Assigned dept) | ✅ (All SBS) | ❌ |
| Delete Grievance Record | ❌ | ❌ | ❌ | ❌ | ❌ *(Hard-delete forbidden)* |

---

## 3. Workflow State Transition Matrix

The table below enforces authorized state transitions. Any transition not explicitly listed is rejected with `403 Forbidden` / `INVALID_STATE_TRANSITION`.

| Initial State | Target State | Permitted Roles | Required Conditions & Trigger Action |
| :--- | :--- | :--- | :--- |
| *(None)* | `SUBMITTED` | `STUDENT` | Student lodges new grievance for active enrolled course. |
| `SUBMITTED` | `UNDER_REVIEW` | `COURSE_COORDINATOR` | Coordinator acknowledges receipt and begins active evaluation. |
| `UNDER_REVIEW` | `AWAITING_STUDENT_INFO` | `COURSE_COORDINATOR`, `HOD`, `DIRECTOR` | Officer issues formal document request specifying requested files and instructions. |
| `AWAITING_STUDENT_INFO` | `UNDER_REVIEW` | `STUDENT` | Student successfully uploads requested supplementary document(s). |
| `UNDER_REVIEW` | `FORWARDED` | `COURSE_COORDINATOR` | Coordinator escalates grievance to Tier 2 (Department Head) with mandatory forwarding note. |
| `FORWARDED` | `UNDER_REVIEW` | `HOD` | Department Head opens and reviews the escalated complaint at Tier 2. |
| `UNDER_REVIEW` | `FORWARDED` | `HOD` | Department Head escalates grievance to Tier 3 (Director) with mandatory forwarding justification. |
| `FORWARDED` | `UNDER_REVIEW` | `DIRECTOR` | Director opens and reviews the escalated complaint at Tier 3. |
| `UNDER_REVIEW` | `RESOLVED` | `COURSE_COORDINATOR`, `HOD`, `DIRECTOR` | Officer at current tier formulates resolution, enters official remarks, and marks resolved. |
| `UNDER_REVIEW` | `DISMISSED` | `HOD`, `DIRECTOR` | Senior official closes grievance with formal recorded findings (e.g. frivolous, lack of merit, out of jurisdiction). |

---

## 4. Department & Course Tenancy Isolation Rules

1. **Course Isolation**:
   - A `COURSE_COORDINATOR` assigned to *M.Sc. Mathematics* has zero query visibility into *B.Sc. Mathematics* or *M.Sc. Physics*.
   - Database queries for coordinators **must** include:  
     `WHERE courseId IN (SELECT courseId FROM StaffAssignment WHERE userId = :currentUserId AND isActive = true)`.

2. **Department Isolation**:
   - A `HOD` of *Physics* has zero query visibility into *Chemistry*, *Mathematics*, or *Geography*.
   - Database queries for HoDs **must** include:  
     `WHERE departmentId = :hodAssignedDepartmentId`.

3. **School-Wide Scope**:
   - The `DIRECTOR` has read and escalation authority across all SBS departments, but can only act on grievances that have either been escalated to Tier 3 or flagged directly as institutional-level issues.

4. **Student Privacy Isolation**:
   - A student can never enumerate or search other students' grievances.
   - Database queries for students **must** enforce:  
     `WHERE studentId = :currentUserId`.
