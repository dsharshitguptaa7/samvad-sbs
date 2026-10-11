# SAMVAD Decisions Needed & Sensible Architectural Defaults
**School of Basic Sciences, CSJMU Kanpur**  
*Document Version: 2.0 (Master Production Specification)*  

---

## 1. Overview & Policy Objective

To ensure complete architectural integrity without inventing or assuming university statutes, this document records critical policy, operational, and statutory decisions that require formal confirmation from the **CSJMU Administration and Director, School of Basic Sciences**.

For every unresolved policy question, a **sensible architectural default** has been defined so development can proceed seamlessly without blocking.

---

## 2. Policy & Operational Decision Log

| # | Policy Area | Question for CSJMU Administration | Sensible Architectural Default | Rationale & Architectural Impact |
| :-: | :--- | :--- | :--- | :--- |
| **D-01** | **Resolution Authority by Tier** | Who has final authority to resolve a grievance? Can a Course Coordinator or HoD finally resolve a grievance, or must all resolutions be approved by the Director? | **Tiered Independent Resolution Authority**:<br>- Tier 1 (Coordinator): Can resolve course-level matters (e.g., internal test clarifications, lab attendance disputes).<br>- Tier 2 (HoD): Can resolve department-level matters.<br>- Tier 3 (Director): Resolves escalated appeals and school-wide grievances.<br>If a student is dissatisfied with a Tier 1 or 2 resolution, they may appeal (see D-03). | Prevents bottle-necking all trivial grievances at the Director's desk while ensuring students still have an escalation path if unsatisfied. |
| **D-02** | **Reassignment Impact on Pending Cases** | When a Course Coordinator or HoD is reassigned or replaced by Admin, what happens to currently pending grievances? | **Course/Department Tenancy Binding**:<br>Grievances belong to the Course and Department. When an admin reassigns the Coordinator for a course, the newly active Coordinator immediately inherits the course queue.<br>Historical timeline entries remain immutably stamped with the previous coordinator's user ID. | Prevents orphaned grievances and eliminates complex manual case transfers while maintaining complete audit fidelity. |
| **D-03** | **Student Appeal & Escalation Window** | Does a student have the statutory right to appeal a resolution if dissatisfied, and within what timeframe? | **14-Day Formal Appeal Window**:<br>Within 14 calendar days of a Tier 1 or Tier 2 resolution, the student can submit an appeal with written justification. The case escalates to the next tier marked `APPEAL_REQUESTED`. After 14 days, the resolution locks permanently. | Prevents indefinite re-opening while complying with UGC Student Grievance Redressal Regulations. |
| **D-04** | **SLA Timers vs Automatic Escalations** | Are specific resolution SLAs mandated (e.g. 7 days at Coordinator, 7 days at HoD)? Should breaches trigger automatic escalation? | **Visual Elapsed Badges Without Automated Escalation**:<br>Dashboards display elapsed time badges (e.g. `Elapsed: 8 days`). Strictly **zero automated state transitions or automated escalations**, keeping all workflow movements 100% human-managed. | Fulfills Non-Negotiable Requirement 7 ("Zero automated or AI decisions") while helping officials identify aging cases. |
| **D-05** | **Standardized Dismissal Grounds** | What standardized grounds exist for formal grievance dismissal? | **Standard Redressal Taxonomy**:<br>Officials must select one of:<br>1. `OUT_OF_JURISDICTION`<br>2. `INSUFFICIENT_EVIDENCE`<br>3. `DUPLICATE_SUBMISSION`<br>4. `REFERRED_TO_EXAM_COMMITTEE`<br>5. `OTHER_WITH_EXPLANATION`<br>Written explanation is mandatory for all dismissals. | Enforces transparent record-keeping and prevents arbitrary grievance dismissal without stated reasons. |
| **D-06** | **Deactivated Departments & Courses** | When an admin deactivates a department or course, how are past student grievances handled? | **Read-Only Historical Preservation**:<br>Past grievances, documents, and audit histories remain fully visible and searchable. Deactivated departments/courses are simply hidden from student registration and lodging dropdowns. | Complies with Non-Negotiable Requirement 6 ("Do not silently discard grievances or historical records"). |
| **D-07** | **Evidentiary File Limits & Types** | What file types and maximum sizes should be permitted for student and staff evidence? | **Strict 5 MB per File / Max 3 Files / PDF, PNG, JPEG**:<br>Restricted to PDF and raster images (PNG, JPEG). Verified on the server using magic-byte headers. Disguised files (e.g. `.exe` renamed to `.pdf`) are rejected. | Optimizes storage bandwidth and eliminates dangerous active content (macros, executables, scripts). |
| **D-08** | **Document Storage Infrastructure** | Where will uploaded evidence files be stored in production? | **Private Object Storage / Local Protected Storage**:<br>Files stored in a non-public storage volume or S3-compatible bucket (e.g. Cloudflare R2 / AWS S3 / MinIO) and streamed via authenticated proxy `/api/documents/[id]`. | Eliminates public file exposure and supports air-gapped university intranet or cloud deployment. |

---

## 3. Formal Sign-Off Checklist

- [ ] Decision D-01 (Resolution Authority by Tier) confirmed by Director SBS.
- [ ] Decision D-02 (Reassignment Queue Inheritance) approved by Admin.
- [ ] Decision D-03 (14-Day Appeal Window) approved by CSJMU Grievance Committee.
- [ ] Decision D-04 (SLA Visual Badges without automated action) approved.
- [ ] Decision D-05 (Dismissal Taxonomy) approved.
- [ ] Decision D-06 (Read-Only Deactivation Preservation) approved.
