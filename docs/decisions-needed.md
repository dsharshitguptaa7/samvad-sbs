# SAMVAD Decisions Needed & Sensible Architectural Defaults
**School of Basic Sciences, CSJMU Kanpur**

---

## 1. Overview

To maintain complete architectural integrity without inventing or assuming university statutes, this document enumerates operational, legal, and policy decisions that require formal sign-off from the **CSJMU Administration and Director, School of Basic Sciences**.

For each unresolved decision, a **sensible architectural default** has been defined so development can proceed seamlessly without blocking.

---

## 2. Policy & Architectural Decision Log

| # | Policy Area | Question for CSJMU Administration | Sensible Architectural Default | Rationale & Impact |
| :-: | :--- | :--- | :--- | :--- |
| **D-01** | **Student Identity & Verification** | Does CSJMU provide an active ERP database/API to validate student roll numbers and enrollments during sign-up? | **Self-Registration with Mandatory Institutional Identifiers**:<br>Students register providing Name, Roll Number, Enrollment Number, Department, and Course. Account is immediately usable for lodging grievances, with Roll Number recorded on all audit slips. | Enables portal deployment without blocking on university ERP integrations. Can be swapped for SSO/LDAP or ERP API later without database schema alterations. |
| **D-02** | **Departmental Taxonomy** | Is "Geography and Environmental Sciences" recognized as a single integrated department or two independent departments (*Department of Geography* and *Department of Environmental Sciences*)? | **Two Distinct Departments**:<br>Seed as two distinct entries: *Department of Geography* and *Department of Environmental Sciences*. Both share the same admin management UI. | Accommodates separate faculty assignments and courses if split, while an admin can assign the same HoD to both if unified. |
| **D-03** | **Student Appeal / Re-Opening Policy** | Does a student have the statutory right to appeal or re-open a grievance if dissatisfied with a Tier 1 (Coordinator) or Tier 2 (HoD) resolution? | **14-Day Formal Appeal Window**:<br>Within 14 calendar days of a resolution, student can click "Request Appeal" with mandatory justification. This moves the grievance to the next tier's queue marked `APPEAL_REQUESTED`. After 14 days, the resolution is locked permanently. | Prevents perpetual re-litigation while honoring student grievance rights under UGC Redressal Guidelines. |
| **D-04** | **Resolution Timelines & SLAs** | Does CSJMU / UGC mandate specific resolution timeframes (e.g., 7 days at CC, 7 days at HoD, 15 days total)? Should breaches trigger automated actions? | **Visual SLA Timers Without Automated State Changes**:<br>Display elapsed time badges (e.g., `Overdue: Day 16/15`) on staff dashboards. Strictly **no automated escalation or automated resolution**, keeping decisions 100% human-managed. | Complies strictly with the "no automated decisions" mandate while assisting staff in monitoring pending grievance ages. |
| **D-05** | **Anonymous Grievance Filing** | Does university grievance policy permit anonymous complaints? | **Non-Anonymous (Verified Identity Required)**:<br>Students must be logged in. The document request loop and course-specific review require authentic student communication. | Anonymous filings prevent follow-up document requests and invite vexatious submissions. If whistleblowing policy is later enacted, a separate channel can be added. |
| **D-06** | **Document Storage Location** | What infrastructure will host evidentiary documents? On-premise CSJMU servers or cloud storage (AWS S3 / Cloudflare R2)? | **S3-Compatible Storage Provider Interface**:<br>Implement storage layer using standard AWS S3 SDK with endpoint override. Supports local filesystem storage in development and AWS S3, Cloudflare R2, or CSJMU-hosted MinIO in production. | Provides cloud flexibility and data sovereignty compliance without vendor lock-in. |
| **D-07** | **Notification Dispatch** | Will CSJMU provide official SMTP credentials or SMS gateway access for dispatching student alerts? | **In-Portal Notification Banners with Optional SMTP**:<br>Student and staff dashboards feature real-time status banners and badge counts as primary notification. If `SMTP_*` variables are provided in `.env`, background email alerts are dispatched. | Portal is fully functional offline or on isolated intranets without third-party email dependencies. |
| **D-08** | **Jurisdiction & Rejection Grounds** | What standardized grounds exist for formal grievance dismissal (e.g., sub judice, disciplinary committee matter, frivolous)? | **Standard Redressal Taxonomy**:<br>Provide default dismissal reasons: `OUT_OF_JURISDICTION`, `INSUFFICIENT_EVIDENCE`, `DUPLICATE_SUBMISSION`, `REFERRED_TO_DISCIPLINARY_COMMITTEE`, `OTHER_WITH_EXPLANATION`. | Requires officials to provide written remarks explaining any dismissal to maintain transparent record-keeping. |

---

## 3. Review & Approval Sign-Off Process

To finalize these decisions:
1. Circulate this document to the **Director, School of Basic Sciences, CSJMU**.
2. Record university executive decisions against `D-01` through `D-08`.
3. Update environment configurations and master seed data accordingly during Phase 2 deployment.
