# SAMVAD (संवाद)
**Manual Grievance Redressal Portal**  
**School of Basic Sciences (SBS), Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur**

---

## 1. Overview

**SAMVAD** is a manual, role-based, multi-tiered grievance redressal portal architected for the **School of Basic Sciences (SBS)** at **Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur**.

It establishes a structured, transparent, and auditable pipeline connecting students directly with their **Course Coordinators (Tier 1)**, **Department Heads (Tier 2)**, and the **Director of the School of Basic Sciences (Tier 3)**.

### Core Architecture Principles
- **100% Deterministic & Human-in-the-Loop**: Zero automated triage, machine learning filtering, or bot auto-resolutions. Every grievance is adjudicated by designated faculty and university officials.
- **Strict Role-Based & Attribute-Based Access Control (RBAC/ABAC)**: Complete isolation between departments and courses. Coordinators and HoDs only access grievances within their purview.
- **Append-Only Immutable Audit Trail**: Every status transition, document request, internal remark, and escalation generates an immutable, timestamped ledger entry in PostgreSQL.
- **Evidentiary File Security**: Private storage with magic-byte verification and authenticated streaming routes.
- **Accessibility**: Built to conform with WCAG 2.1 AA standards (keyboard navigability, screen reader semantics, and high color contrast).

---

## 2. Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 14 (App Router, React Server Components, Server Actions) |
| **Language** | TypeScript (Strict Mode) |
| **Styling & Design** | Tailwind CSS + CSJMU Navy-Blue (`#0f2347`) & Gold (`#facc15`) Palette |
| **Database** | Neon Serverless PostgreSQL with pgBouncer Connection Pooling |
| **ORM** | Prisma ORM |
| **Validation** | Zod (Schema validation on client and server boundaries) |
| **Icons** | Lucide React |

---

## 3. Approved Architecture & Planning Specifications

Full architectural specifications are documented in the [`docs/`](./docs) folder:

- [**`docs/requirements.md`**](./docs/requirements.md): Functional and non-functional requirements, user roles, initial departments, out-of-scope boundaries.
- [**`docs/architecture.md`**](./docs/architecture.md): Topology, layered clean architecture, security architecture, file storage pipeline, state machine.
- [**`docs/permissions-matrix.md`**](./docs/permissions-matrix.md): Granular RBAC and tenancy rules for Student, CC, HoD, Director, and Admin.
- [**`docs/data-model.md`**](./docs/data-model.md): Mermaid ERD, normalized PostgreSQL schema, and Prisma models.
- [**`docs/implementation-plan.md`**](./docs/implementation-plan.md): Phased delivery roadmap (Phases 0–7), testing methodology, and quality gates.
- [**`docs/decisions-needed.md`**](./docs/decisions-needed.md): Policy questions for CSJMU administration with sensible defaults.

---

## 4. Academic Departments (School of Basic Sciences)

The portal launches with support for 5 basic sciences units:
1. **Department of Mathematics** (`MATH`)
2. **Department of Physics** (`PHYS`)
3. **Department of Chemistry** (`CHEM`)
4. **Department of Geography** (`GEOG`)
5. **Department of Environmental Sciences** (`ENVS`)

*(Additional departments can be added dynamically by the System Administrator)*.

---

## 5. Getting Started & Development

### Prerequisites
- **Node.js**: v18.17+ or v20+ (Node v26.7+ tested)
- **npm**: v9+ (npm v11+ tested)

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd SAMVAD

# Install dependencies
npm install
```

### Available Scripts
```bash
# Start local development server (http://localhost:3000)
npm run dev

# Run TypeScript typecheck
npm run typecheck

# Run ESLint validation
npm run lint

# Compile production build
npm run build

# Start production server
npm run start
```

---

## 6. Current Implementation Status: Foundation Phase

> [!NOTE]
> **Foundation Phase Milestone**: The project foundation has been established with Next.js App Router, Tailwind CSS, CSJMU branding, accessible layouts, landing page, student registration view, staff login view, track grievance preview, loading states, 404 handler, and error boundary.
> 
> **Forms are currently marked non-functional** pending Phase 1 (Authentication & Session Engine) and Phase 2 (Database Master Data & Prisma Migrations). Real credential authentication or fake mock auth states are intentionally disabled.

---

## 7. Roadmap

- [x] **Planning & Architectural Specifications** (Docs 1–6 complete)
- [x] **Phase 0: Foundation & Bootstrap** (App Router, Tailwind, TypeScript, accessible layouts)
- [ ] **Phase 1: Authentication & Session Engine** (Argon2id hashing, HTTP-only session cookies, staff password reset)
- [ ] **Phase 2: Administrative Core & Master Data** (Departments, Courses, Staff mappings, System audit log)
- [ ] **Phase 3: Student Grievance Filing & Document Upload Engine** (Multi-step form, magic-byte inspection, tracking tokens)
- [ ] **Phase 4: Tier 1 (Course Coordinator) Workflow** (Course queue, document requests, resolution, forward to HoD)
- [ ] **Phase 5: Tier 2 (HoD) & Tier 3 (Director) Escalations** (Departmental queue, appellate directives, institutional closure)
- [ ] **Phase 6: Document Request Loop & Timeline History** (Student clarification UI, authenticated streaming proxy)
- [ ] **Phase 7: Accessibility, Security Hardening & Neon Deployment** (WCAG 2.1 AA audit, penetration checks)
