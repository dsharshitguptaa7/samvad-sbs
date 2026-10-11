# SAMVAD Permissions & Access Control Matrix
**School of Basic Sciences, CSJMU Kanpur**  
*Document Version: 2.0 (Master Production Specification)*  

---

## 1. Role Definitions & Scopes

| Role Code | Role Name | Tenancy / Scope Boundary | Description |
| :--- | :--- | :--- | :--- |
| `STUDENT` | Student | **Personal / Self** | Can lodge grievances against enrolled course; can view and respond only to grievances where `studentId === currentUserId`. |
| `COURSE_COORDINATOR` | Course Coordinator (Tier 1) | **Assigned Course(s)** | Faculty official assigned by Admin to oversee specific courses. Scope is strictly bounded by active `StaffAssignment` records for their courses. |
| `DEPARTMENT_HEAD` | Department Head / HoD (Tier 2) | **Assigned Department** | Academic department head overseeing all courses and grievances within their assigned basic science department. |
| `DIRECTOR` | Director SBS (Tier 3) | **Entire School (SBS)** | Appellate leadership overseeing all basic science departments within the School of Basic Sciences. |
| `SYSTEM_ADMIN` | System Administrator | **System Master Data** | Technical administrator managing users, roles, departments, courses, and security configurations. **Zero grievance adjudication or dispute resolution authority.** |

---

## 2. Resource Permissions Matrix

Legend:
- ✅ **ALLOWED**: Permitted by role policy.
- 🟡 **CONDITIONAL**: Permitted only if the resource satisfies tenancy criteria (own student ID, assigned course ID, assigned department ID).
- ❌ **DENIED**: Strictly forbidden at server boundary.

### 2.1 Academic Master Data & Administrative Operations

| Operation | Student | Course Coordinator | Department Head | Director | System Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Create / Edit Department** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Toggle Department Status (Active/Inactive)** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Create / Edit Course** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Toggle Course Status (Active/Inactive)** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Provision Staff Account (CC, HoD, Director)** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Assign Faculty to Course (Coordinator)** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Map HoD to Department** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Designate Active Director SBS** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Deactivate / Reactivate User Account** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Trigger Staff Password Reset** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **View System Audit Logs** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Self-Register Account** | ✅ (`STUDENT` only) | ❌ | ❌ | ❌ | ❌ |

---

### 2.2 Grievance Access & Read Visibility

| Operation | Student | Course Coordinator | Department Head | Director | System Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Submit New Grievance** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **View Grievance Subject & Description** | 🟡 (Own cases) | 🟡 (Assigned courses) | 🟡 (Assigned dept) | ✅ (All SBS) | ❌ (Metadata only)* |
| **View Uploaded Supporting Documents** | 🟡 (Own cases) | 🟡 (Assigned courses) | 🟡 (Assigned dept) | ✅ (All SBS) | ❌ |
| **View Public Milestone Timeline** | 🟡 (Own cases) | 🟡 (Assigned courses) | 🟡 (Assigned dept) | ✅ (All SBS) | ❌ |
| **View Internal Staff Remarks** | ❌ | 🟡 (Assigned courses) | 🟡 (Assigned dept) | ✅ (All SBS) | ❌ |
| **Download Document Attachment File** | 🟡 (Own cases) | 🟡 (Assigned courses) | 🟡 (Assigned dept) | ✅ (All SBS) | ❌ |
| **Public Status Lookup via Token (on `/track`)** | ✅ (Public) | ✅ (Public) | ✅ (Public) | ✅ (Public) | ✅ (Public) |

*\*Note on Confidentiality: System Administrators manage user accounts and system configuration, but cannot inspect student complaint descriptions or evidence files. This separation of powers protects student privacy and eliminates administrative conflict of interest.*

---

### 2.3 Grievance Lifecycle Actions & State Transitions

| Action / Workflow Step | Student | Course Coordinator | Department Head | Director | System Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Mark Under Review (Tier 1)** | ❌ | 🟡 (Assigned courses) | ❌ | ❌ | ❌ |
| **Mark Under Review (Tier 2)** | ❌ | ❌ | 🟡 (Assigned dept) | ❌ | ❌ |
| **Mark Under Review (Tier 3)** | ❌ | ❌ | ❌ | ✅ (All SBS) | ❌ |
| **Add Internal Faculty Remark** | ❌ | 🟡 (Assigned courses) | 🟡 (Assigned dept) | ✅ (All SBS) | ❌ |
| **Create Formal Document Request** | ❌ | 🟡 (Assigned courses) | 🟡 (Assigned dept) | ✅ (All SBS) | ❌ |
| **Upload Requested Document** | 🟡 (Own pending request) | ❌ | ❌ | ❌ | ❌ |
| **Forward to HoD (Tier 1 $\rightarrow$ 2)** | ❌ | 🟡 (Assigned courses) | ❌ | ❌ | ❌ |
| **Forward to Director (Tier 2 $\rightarrow$ 3)** | ❌ | ❌ | 🟡 (Assigned dept) | ❌ | ❌ |
| **Resolve Grievance (Tier 1)** | ❌ | 🟡 (Assigned courses) | ❌ | ❌ | ❌ |
| **Resolve Grievance (Tier 2)** | ❌ | ❌ | 🟡 (Assigned dept) | ❌ | ❌ |
| **Resolve Grievance (Tier 3)** | ❌ | ❌ | ❌ | ✅ (All SBS) | ❌ |
| **Dismiss Grievance (With Grounds)** | ❌ | ❌ | 🟡 (Assigned dept) | ✅ (All SBS) | ❌ |
| **Hard-Delete Grievance Record** | ❌ | ❌ | ❌ | ❌ | ❌ *(Forbidden)* |

---

## 3. Workflow State Transition Matrix

The table below defines the authorized grievance states and permitted transitions. Any mutation that attempts a state transition outside this matrix is rejected at the server boundary with HTTP 403 / `INVALID_STATE_TRANSITION`.

| Initial State | Target State | Permitted Role(s) | Required Preconditions & Trigger |
| :--- | :--- | :--- | :--- |
| *(None)* | `SUBMITTED` | `STUDENT` | Student lodges new grievance for active enrolled course. Initial tier set to `TIER_1_COORDINATOR`. |
| `SUBMITTED` | `UNDER_REVIEW` | `COURSE_COORDINATOR` | Coordinator acknowledges receipt and opens case evaluation for assigned course. |
| `UNDER_REVIEW` | `AWAITING_STUDENT_INFO` | `COURSE_COORDINATOR`, `DEPARTMENT_HEAD`, `DIRECTOR` | Officer issues formal document request with written instructions and optional deadline. |
| `AWAITING_STUDENT_INFO` | `UNDER_REVIEW` | `STUDENT` | Student uploads requested document(s) fulfilling the pending document request. |
| `UNDER_REVIEW` | `FORWARDED` | `COURSE_COORDINATOR` | Coordinator escalates case to Tier 2 (HoD) with mandatory forwarding note. `currentTier` advances to `TIER_2_HOD`. |
| `FORWARDED` | `UNDER_REVIEW` | `DEPARTMENT_HEAD` | Department Head opens and reviews the escalated complaint at Tier 2. |
| `UNDER_REVIEW` | `FORWARDED` | `DEPARTMENT_HEAD` | Department Head escalates case to Tier 3 (Director) with mandatory forwarding note. `currentTier` advances to `TIER_3_DIRECTOR`. |
| `FORWARDED` | `UNDER_REVIEW` | `DIRECTOR` | Director opens and reviews the appellate case at Tier 3. |
| `UNDER_REVIEW` | `RESOLVED` | `COURSE_COORDINATOR`, `DEPARTMENT_HEAD`, `DIRECTOR` | Authorized official at current tier formulates resolution, enters official remarks, and records `resolvedAt = now()`. |
| `UNDER_REVIEW` | `DISMISSED` | `DEPARTMENT_HEAD`, `DIRECTOR` | Senior official dismisses case with stated grounds (`OUT_OF_JURISDICTION`, `INSUFFICIENT_EVIDENCE`, `DUPLICATE_SUBMISSION`, `OTHER`). |

---

## 4. Tenancy Isolation & Query Verification Rules

To enforce strict attribute-based access control (ABAC), data queries and mutations must include tenancy boundaries:

### 4.1 Course Coordinator Scope
```sql
-- Coordinator can only query grievances matching their active course assignments
SELECT * FROM "Grievance"
WHERE "courseId" IN (
  SELECT "courseId" FROM "StaffAssignment"
  WHERE "userId" = :currentUserId AND "isActive" = true AND "role" = 'COURSE_COORDINATOR'
);
```

### 4.2 Department Head Scope
```sql
-- HoD can only query grievances matching their active department assignment
SELECT * FROM "Grievance"
WHERE "departmentId" IN (
  SELECT "departmentId" FROM "StaffAssignment"
  WHERE "userId" = :currentUserId AND "isActive" = true AND "role" = 'DEPARTMENT_HEAD'
);
```

### 4.3 Student Scope
```sql
-- Student can only query their own grievances
SELECT * FROM "Grievance"
WHERE "studentId" = :currentUserId;
```

### 4.4 Director Scope
```sql
-- Director can query all grievances across SBS
SELECT * FROM "Grievance";
```
