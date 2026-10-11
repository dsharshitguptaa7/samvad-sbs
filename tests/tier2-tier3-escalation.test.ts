import "dotenv/config";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/lib/prisma";
import {
  UserRole,
  GrievanceCategory,
  GrievanceStatus,
  GrievanceTier,
  TimelineActionType,
  TimelineVisibility,
} from "@prisma/client";
import { createStudentGrievance } from "../src/lib/grievance/submission";
import {
  verifyHodAccess,
  hodMarkUnderReview,
  hodAddInternalRemark,
  hodRequestDocuments,
  hodForwardToDirector,
  hodResolveGrievance,
  hodDismissGrievance,
  verifyDirectorAccess,
  directorMarkUnderReview,
  directorAddInternalRemark,
  directorRequestDocuments,
  directorResolveGrievance,
  directorDismissGrievance,
} from "../src/lib/escalation/workflow";

describe("SAMVAD Phase 5: Tier 2 (HoD) & Tier 3 (Director) Escalation & Adjudication Tests", () => {
  // Test accounts & identifiers
  const studentEmail = "student.phase5.test@csjmu.ac.in";
  const hodDept1Email = "hod1.phase5.test@csjmu.ac.in";
  const hodDept2Email = "hod2.phase5.test@csjmu.ac.in"; // Cross-department HoD
  const directorEmail = "director.phase5.test@csjmu.ac.in";

  const dept1Code = "TEST_PH5_MATH";
  const dept2Code = "TEST_PH5_PHYS";
  const course1Code = "TEST_PH5_CRS1";

  let studentId = "";
  let hodDept1Id = "";
  let hodDept2Id = "";
  let directorId = "";
  let dept1Id = "";
  let dept2Id = "";
  let course1Id = "";

  let grievance1Id = "";
  let grievance2Id = "";

  async function cleanupTestData() {
    try {
      const users = await prisma.user.findMany({
        where: {
          email: {
            in: [studentEmail, hodDept1Email, hodDept2Email, directorEmail, "coord.ph5.test@csjmu.ac.in"],
          },
        },
      });
      const userIds = users.map((u) => u.id);

      if (userIds.length > 0) {
        const grievances = await prisma.grievance.findMany({
          where: { studentId: { in: userIds } },
        });
        const gIds = grievances.map((g) => g.id);

        if (gIds.length > 0) {
          await prisma.grievanceTimelineAction.deleteMany({
            where: { grievanceId: { in: gIds } },
          });
          await prisma.documentRequest.deleteMany({
            where: { grievanceId: { in: gIds } },
          });
          await prisma.grievanceDocument.deleteMany({
            where: { grievanceId: { in: gIds } },
          });
          await prisma.grievance.deleteMany({
            where: { id: { in: gIds } },
          });
        }

        await prisma.staffAssignment.deleteMany({
          where: { userId: { in: userIds } },
        });

        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }

      await prisma.course.deleteMany({
        where: { code: course1Code },
      });

      await prisma.department.deleteMany({
        where: { code: { in: [dept1Code, dept2Code] } },
      });
    } catch (e) {
      console.error("Cleanup error in Phase 5 tests:", e);
    }
  }

  before(async () => {
    await cleanupTestData();

    // 1. Create Departments
    const dept1 = await prisma.department.create({
      data: {
        name: "Test Dept 1 Mathematics",
        code: dept1Code,
        isActive: true,
      },
    });
    dept1Id = dept1.id;

    const dept2 = await prisma.department.create({
      data: {
        name: "Test Dept 2 Physics",
        code: dept2Code,
        isActive: true,
      },
    });
    dept2Id = dept2.id;

    // 2. Create Course in Dept 1
    const course1 = await prisma.course.create({
      data: {
        name: "Test M.Sc. Math Course",
        code: course1Code,
        departmentId: dept1Id,
        isActive: true,
      },
    });
    course1Id = course1.id;

    // 3. Create Users
    const student = await prisma.user.create({
      data: {
        email: studentEmail,
        fullName: "Phase 5 Test Student",
        passwordHash: "$2a$12$FakeHashPasswordTestStudent1234567890",
        role: UserRole.STUDENT,
        rollNumber: "TEST-PH5-ROLL-01",
        enrollmentNo: "TEST-PH5-ENR-01",
        isActive: true,
      },
    });
    studentId = student.id;

    const hod1 = await prisma.user.create({
      data: {
        email: hodDept1Email,
        fullName: "Dr. HoD Dept 1",
        passwordHash: "$2a$12$FakeHashPasswordTestHod1234567890",
        role: UserRole.DEPARTMENT_HEAD,
        isActive: true,
      },
    });
    hodDept1Id = hod1.id;

    const hod2 = await prisma.user.create({
      data: {
        email: hodDept2Email,
        fullName: "Dr. HoD Dept 2 (Physics)",
        passwordHash: "$2a$12$FakeHashPasswordTestHod1234567890",
        role: UserRole.DEPARTMENT_HEAD,
        isActive: true,
      },
    });
    hodDept2Id = hod2.id;

    const director = await prisma.user.create({
      data: {
        email: directorEmail,
        fullName: "Prof. Director SBS",
        passwordHash: "$2a$12$FakeHashPasswordTestDirector1234567890",
        role: UserRole.DIRECTOR,
        isActive: true,
      },
    });
    directorId = director.id;

    // 3b. Create Course Coordinator for Course 1
    const coord = await prisma.user.create({
      data: {
        email: "coord.ph5.test@csjmu.ac.in",
        fullName: "Dr. Coord Ph5",
        passwordHash: "$2a$12$FakeHashPasswordTestCoord1234567890",
        role: UserRole.COURSE_COORDINATOR,
        isActive: true,
      },
    });

    await prisma.staffAssignment.create({
      data: {
        userId: coord.id,
        departmentId: dept1Id,
        courseId: course1Id,
        role: UserRole.COURSE_COORDINATOR,
        isActive: true,
      },
    });

    // 4. Assign HoD 1 to Dept 1, HoD 2 to Dept 2
    await prisma.staffAssignment.create({
      data: {
        userId: hodDept1Id,
        departmentId: dept1Id,
        courseId: null,
        role: UserRole.DEPARTMENT_HEAD,
        isActive: true,
      },
    });

    await prisma.staffAssignment.create({
      data: {
        userId: hodDept2Id,
        departmentId: dept2Id,
        courseId: null,
        role: UserRole.DEPARTMENT_HEAD,
        isActive: true,
      },
    });

    // 5. Submit initial grievances for testing
    const g1Res = await createStudentGrievance({
      studentId: studentId,
      courseId: course1Id,
      category: GrievanceCategory.EXAMINATION,
      subject: "Tier 2 HoD Test Grievance 1",
      description: "Testing HoD review, escalation, and resolution workflow mechanics.",
      reliefSought: "Immediate departmental re-evaluation.",
    });
    assert.strictEqual(g1Res.success, true);
    assert.ok(g1Res.grievance);
    grievance1Id = g1Res.grievance.id;

    // Fast-forward Grievance 1 to Tier 2 FORWARDED (as if Coordinator forwarded it)
    await prisma.grievance.update({
      where: { id: grievance1Id },
      data: {
        currentTier: GrievanceTier.TIER_2_HOD,
        currentStatus: GrievanceStatus.FORWARDED,
      },
    });

    const g2Res = await createStudentGrievance({
      studentId: studentId,
      courseId: course1Id,
      category: GrievanceCategory.ACADEMIC,
      subject: "Tier 2 HoD Test Grievance 2 for Dismissal",
      description: "Testing HoD dismissal grounds and rationale mechanics.",
    });
    assert.strictEqual(g2Res.success, true);
    assert.ok(g2Res.grievance);
    grievance2Id = g2Res.grievance.id;

    await prisma.grievance.update({
      where: { id: grievance2Id },
      data: {
        currentTier: GrievanceTier.TIER_2_HOD,
        currentStatus: GrievanceStatus.FORWARDED,
      },
    });
  });

  after(async () => {
    await cleanupTestData();
  });

  // ---------------------------------------------------------------------------
  // TENANCY & RBAC AUTHORIZATION CHECKS
  // ---------------------------------------------------------------------------

  it("should allow HoD 1 to access Grievance 1 (belonging to Dept 1)", async () => {
    const access = await verifyHodAccess(hodDept1Id, grievance1Id);
    assert.strictEqual(access.allowed, true);
    assert.ok(access.grievance);
    assert.strictEqual(access.grievance.id, grievance1Id);
  });

  it("should STRICTLY REJECT HoD 2 (Dept 2) from accessing Dept 1 Grievance 1 (403)", async () => {
    const access = await verifyHodAccess(hodDept2Id, grievance1Id);
    assert.strictEqual(access.allowed, false);
    assert.strictEqual(access.statusCode, 403);
    assert.ok(access.error?.includes("Access denied"));
  });

  it("should allow Director to access grievance across any department", async () => {
    const access = await verifyDirectorAccess(directorId, grievance1Id);
    assert.strictEqual(access.allowed, true);
    assert.ok(access.grievance);
  });

  it("should deny Director access if user is not Director role", async () => {
    const access = await verifyDirectorAccess(hodDept1Id, grievance1Id);
    assert.strictEqual(access.allowed, false);
    assert.strictEqual(access.statusCode, 403);
  });

  // ---------------------------------------------------------------------------
  // TIER 2: DEPARTMENT HEAD WORKFLOW ACTIONS
  // ---------------------------------------------------------------------------

  it("HoD: should transition FORWARDED -> UNDER_REVIEW with public timeline log", async () => {
    const res = await hodMarkUnderReview(
      { actorUserId: hodDept1Id, grievanceId: grievance1Id },
      "Commenced departmental review and summoned examination records."
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.grievance?.currentStatus, GrievanceStatus.UNDER_REVIEW);
    assert.strictEqual(res.grievance?.currentTier, GrievanceTier.TIER_2_HOD);

    const action = await prisma.grievanceTimelineAction.findFirst({
      where: {
        grievanceId: grievance1Id,
        actionType: TimelineActionType.UNDER_REVIEW_MARKED,
        actorId: hodDept1Id,
      },
    });
    assert.ok(action);
    assert.strictEqual(action.visibility, TimelineVisibility.PUBLIC_TO_STUDENT);
    assert.strictEqual(action.actorRole, UserRole.DEPARTMENT_HEAD);
  });

  it("HoD: should record INTERNAL_STAFF_ONLY confidential remark", async () => {
    const res = await hodAddInternalRemark(
      { actorUserId: hodDept1Id, grievanceId: grievance1Id },
      "Internal HoD note: Evaluator consulted; moderation committee convene tomorrow."
    );

    assert.strictEqual(res.success, true);

    const action = await prisma.grievanceTimelineAction.findFirst({
      where: {
        grievanceId: grievance1Id,
        actionType: TimelineActionType.INTERNAL_REMARK_ADDED,
        actorId: hodDept1Id,
      },
    });
    assert.ok(action);
    assert.strictEqual(action.visibility, TimelineVisibility.INTERNAL_STAFF_ONLY);
  });

  it("HoD: should request clarification and shift status to AWAITING_STUDENT_INFO", async () => {
    const deadline = new Date(Date.now() + 72 * 3600 * 1000);
    const res = await hodRequestDocuments(
      { actorUserId: hodDept1Id, grievanceId: grievance1Id },
      "Please upload copy of admit card with center superintendent signature.",
      deadline
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.grievance?.currentStatus, GrievanceStatus.AWAITING_STUDENT_INFO);

    const docReq = await prisma.documentRequest.findFirst({
      where: {
        grievanceId: grievance1Id,
        requestedById: hodDept1Id,
      },
    });
    assert.ok(docReq);
    assert.strictEqual(docReq.requestedTier, GrievanceTier.TIER_2_HOD);
  });

  it("HoD: should reject dismissal or resolution if not UNDER_REVIEW (when in AWAITING_STUDENT_INFO)", async () => {
    const res = await hodResolveGrievance(
      { actorUserId: hodDept1Id, grievanceId: grievance1Id },
      "Premature resolution attempt while awaiting documents."
    );
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.error?.includes("UNDER_REVIEW"));
  });

  it("HoD: should resume to UNDER_REVIEW", async () => {
    // Put back to UNDER_REVIEW
    await prisma.grievance.update({
      where: { id: grievance1Id },
      data: { currentStatus: GrievanceStatus.UNDER_REVIEW },
    });
  });

  it("HoD: should forward to School Director (TIER_3_DIRECTOR, FORWARDED)", async () => {
    const res = await hodForwardToDirector(
      { actorUserId: hodDept1Id, grievanceId: grievance1Id },
      "This case involves university-wide examination policy interpretation beyond HoD authority."
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.grievance?.currentTier, GrievanceTier.TIER_3_DIRECTOR);
    assert.strictEqual(res.grievance?.currentStatus, GrievanceStatus.FORWARDED);

    const action = await prisma.grievanceTimelineAction.findFirst({
      where: {
        grievanceId: grievance1Id,
        actionType: TimelineActionType.FORWARDED,
        toTier: GrievanceTier.TIER_3_DIRECTOR,
      },
    });
    assert.ok(action);
    assert.strictEqual(action.fromTier, GrievanceTier.TIER_2_HOD);
    assert.strictEqual(action.toTier, GrievanceTier.TIER_3_DIRECTOR);
  });

  it("HoD: should reject further Tier 2 actions once case has escalated to Tier 3", async () => {
    const res = await hodResolveGrievance(
      { actorUserId: hodDept1Id, grievanceId: grievance1Id },
      "Illegal attempt by HoD to resolve after escalation to Director."
    );
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.error?.includes("TIER_3_DIRECTOR"));
  });

  // ---------------------------------------------------------------------------
  // TIER 2: HOD DISMISSAL FLOW (Grievance 2)
  // ---------------------------------------------------------------------------

  it("HoD: should dismiss Grievance 2 with mandatory grounds and factual reasoning", async () => {
    // Open review first
    await hodMarkUnderReview(
      { actorUserId: hodDept1Id, grievanceId: grievance2Id },
      "HoD preliminary review."
    );

    const res = await hodDismissGrievance(
      { actorUserId: hodDept1Id, grievanceId: grievance2Id },
      "INSUFFICIENT_EVIDENCE",
      "Departmental enquiry found no evidence of irregular conduct during practical viva."
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.grievance?.currentStatus, GrievanceStatus.DISMISSED);
    assert.ok(res.grievance?.resolvedAt);
    assert.ok(res.grievance?.resolutionSummary?.includes("INSUFFICIENT_EVIDENCE"));

    const action = await prisma.grievanceTimelineAction.findFirst({
      where: {
        grievanceId: grievance2Id,
        actionType: TimelineActionType.DISMISSED,
      },
    });
    assert.ok(action);
    assert.strictEqual(action.fromStatus, GrievanceStatus.UNDER_REVIEW);
    assert.strictEqual(action.toStatus, GrievanceStatus.DISMISSED);
  });

  // ---------------------------------------------------------------------------
  // TIER 3: SCHOOL DIRECTOR APPELLATE WORKFLOW (Grievance 1)
  // ---------------------------------------------------------------------------

  it("Director: should mark escalated case UNDER_REVIEW at Tier 3", async () => {
    const res = await directorMarkUnderReview(
      { actorUserId: directorId, grievanceId: grievance1Id },
      "Admitted into Directorate appellate review; referred to School Academic Committee."
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.grievance?.currentStatus, GrievanceStatus.UNDER_REVIEW);
    assert.strictEqual(res.grievance?.currentTier, GrievanceTier.TIER_3_DIRECTOR);

    const action = await prisma.grievanceTimelineAction.findFirst({
      where: {
        grievanceId: grievance1Id,
        actorId: directorId,
        actionType: TimelineActionType.UNDER_REVIEW_MARKED,
      },
    });
    assert.ok(action);
    assert.strictEqual(action.actorRole, UserRole.DIRECTOR);
  });

  it("Director: should record confidential Directorate directive", async () => {
    const res = await directorAddInternalRemark(
      { actorUserId: directorId, grievanceId: grievance1Id },
      "Directorate note: Examination board meeting scheduled for final approval."
    );

    assert.strictEqual(res.success, true);

    const action = await prisma.grievanceTimelineAction.findFirst({
      where: {
        grievanceId: grievance1Id,
        actorId: directorId,
        actionType: TimelineActionType.INTERNAL_REMARK_ADDED,
      },
    });
    assert.ok(action);
    assert.strictEqual(action.visibility, TimelineVisibility.INTERNAL_STAFF_ONLY);
  });

  it("Director: should issue final institutional resolution (RESOLVED)", async () => {
    const res = await directorResolveGrievance(
      { actorUserId: directorId, grievanceId: grievance1Id },
      "Directorial Decision: Special re-test authorized under SBS Ordinance Section 4. Case closed."
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.grievance?.currentStatus, GrievanceStatus.RESOLVED);
    assert.ok(res.grievance?.resolvedAt);

    const action = await prisma.grievanceTimelineAction.findFirst({
      where: {
        grievanceId: grievance1Id,
        actionType: TimelineActionType.RESOLVED,
      },
    });
    assert.ok(action);
    assert.strictEqual(action.actorRole, UserRole.DIRECTOR);
  });

  // ---------------------------------------------------------------------------
  // PUBLIC TRACKING REDACTION VERIFICATION
  // ---------------------------------------------------------------------------

  it("Public / Student Timeline: internal notes must NOT leak in student-facing visibility", async () => {
    // Fetch actions using the public student visibility rule
    const publicActions = await prisma.grievanceTimelineAction.findMany({
      where: {
        grievanceId: grievance1Id,
        visibility: TimelineVisibility.PUBLIC_TO_STUDENT,
      },
    });

    const internalActions = await prisma.grievanceTimelineAction.findMany({
      where: {
        grievanceId: grievance1Id,
        visibility: TimelineVisibility.INTERNAL_STAFF_ONLY,
      },
    });

    // Ensure internal notes were logged
    assert.ok(internalActions.length >= 2); // 1 from HoD, 1 from Director

    // Ensure none of the internal actions leaked into publicActions
    for (const act of publicActions) {
      assert.strictEqual(act.visibility, TimelineVisibility.PUBLIC_TO_STUDENT);
      assert.notStrictEqual(act.actionType, TimelineActionType.INTERNAL_REMARK_ADDED);
    }
  });
});
