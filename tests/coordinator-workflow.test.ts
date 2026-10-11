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
  coordinatorMarkUnderReview,
  coordinatorAddInternalRemark,
  coordinatorRequestDocuments,
  coordinatorForwardToHod,
  coordinatorResolveGrievance,
  verifyCoordinatorAccess,
} from "../src/lib/coordinator/workflow";

describe("SAMVAD Phase 4: Tier 1 Course Coordinator Queue & Workflow Actions Tests", () => {
  // Test Identifiers
  const studentEmail = "student.phase4.test@csjmu.ac.in";
  const coordinator1Email = "coord1.phase4.test@csjmu.ac.in";
  const coordinator2Email = "coord2.phase4.test@csjmu.ac.in"; // Cross-course coordinator
  const hodEmail = "hod.phase4.test@csjmu.ac.in";

  const deptCode = "TEST_PH4_DEPT";
  const course1Code = "TEST_PH4_CRS1";
  const course2Code = "TEST_PH4_CRS2";

  let studentId = "";
  let coordinator1Id = "";
  let coordinator2Id = "";
  let hodId = "";
  let deptId = "";
  let course1Id = "";
  let course2Id = "";

  let grievance1Id = "";

  async function cleanupTestData() {
    try {
      const users = await prisma.user.findMany({
        where: {
          email: {
            in: [studentEmail, coordinator1Email, coordinator2Email, hodEmail],
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
          await prisma.grievanceDocument.deleteMany({ where: { grievanceId: { in: gIds } } });
          await prisma.documentRequest.deleteMany({ where: { grievanceId: { in: gIds } } });
          await prisma.grievanceTimelineAction.deleteMany({ where: { grievanceId: { in: gIds } } });
          await prisma.grievance.deleteMany({ where: { id: { in: gIds } } });
        }

        await prisma.staffAssignment.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }

      const dept = await prisma.department.findUnique({
        where: { code: deptCode },
        include: { courses: true },
      });
      if (dept) {
        const cIds = dept.courses.map((c) => c.id);
        await prisma.staffAssignment.deleteMany({ where: { departmentId: dept.id } });
        await prisma.grievance.deleteMany({ where: { departmentId: dept.id } });
        await prisma.course.deleteMany({ where: { id: { in: cIds } } });
        await prisma.department.delete({ where: { id: dept.id } });
      }
    } catch (e) {
      console.error("Cleanup error in Phase 4 tests:", e);
    }
  }

  before(async () => {
    await cleanupTestData();

    // 1. Create Academic Master Data
    const dept = await prisma.department.create({
      data: {
        name: "Phase 4 Test Department",
        code: deptCode,
        description: "Department for coordinator testing",
        isActive: true,
      },
    });
    deptId = dept.id;

    const c1 = await prisma.course.create({
      data: {
        departmentId: deptId,
        name: "Course 1 (Assigned to Coord 1)",
        code: course1Code,
        programType: "Postgraduate",
        isActive: true,
      },
    });
    course1Id = c1.id;

    const c2 = await prisma.course.create({
      data: {
        departmentId: deptId,
        name: "Course 2 (Assigned to Coord 2)",
        code: course2Code,
        programType: "Postgraduate",
        isActive: true,
      },
    });
    course2Id = c2.id;

    // 2. Create Users
    const student = await prisma.user.create({
      data: {
        fullName: "Karan Singh",
        email: studentEmail,
        role: UserRole.STUDENT,
        rollNumber: "PH4_STUDENT_01",
        enrollmentNo: "CSJM_PH4_001",
        phoneNumber: "9876543201",
        passwordHash: "$2b$12$dummyhashforphase4tests00000000000000000000000000000",
        isActive: true,
      },
    });
    studentId = student.id;

    const coord1 = await prisma.user.create({
      data: {
        fullName: "Dr. Alok Nath",
        email: coordinator1Email,
        role: UserRole.COURSE_COORDINATOR,
        phoneNumber: "9876543202",
        passwordHash: "$2b$12$dummyhashforphase4tests00000000000000000000000000000",
        isActive: true,
      },
    });
    coordinator1Id = coord1.id;

    const coord2 = await prisma.user.create({
      data: {
        fullName: "Dr. B. K. Mishra",
        email: coordinator2Email,
        role: UserRole.COURSE_COORDINATOR,
        phoneNumber: "9876543203",
        passwordHash: "$2b$12$dummyhashforphase4tests00000000000000000000000000000",
        isActive: true,
      },
    });
    coordinator2Id = coord2.id;

    const hod = await prisma.user.create({
      data: {
        fullName: "Prof. S. C. Garg",
        email: hodEmail,
        role: UserRole.DEPARTMENT_HEAD,
        phoneNumber: "9876543204",
        passwordHash: "$2b$12$dummyhashforphase4tests00000000000000000000000000000",
        isActive: true,
      },
    });
    hodId = hod.id;

    // 3. Create Staff Assignments
    // Coord 1 assigned to Course 1
    await prisma.staffAssignment.create({
      data: {
        userId: coordinator1Id,
        role: UserRole.COURSE_COORDINATOR,
        departmentId: deptId,
        courseId: course1Id,
        isActive: true,
      },
    });

    // Coord 2 assigned to Course 2
    await prisma.staffAssignment.create({
      data: {
        userId: coordinator2Id,
        role: UserRole.COURSE_COORDINATOR,
        departmentId: deptId,
        courseId: course2Id,
        isActive: true,
      },
    });

    // HoD assigned to Department
    await prisma.staffAssignment.create({
      data: {
        userId: hodId,
        role: UserRole.DEPARTMENT_HEAD,
        departmentId: deptId,
        courseId: null,
        isActive: true,
      },
    });

    // 4. Create Grievance under Course 1
    const gResult = await createStudentGrievance({
      studentId,
      courseId: course1Id,
      category: GrievanceCategory.ACADEMIC,
      subject: "Semester Evaluation Discrepancy",
      description: "Detailed account of evaluation discrepancy in Course 1 practical laboratory examinations.",
    });

    assert.equal(gResult.success, true);
    assert.ok(gResult.grievance);
    grievance1Id = gResult.grievance.id;
  });

  after(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // ===========================================================================
  // 1. Tenancy Enforcement & Scoped Access
  // ===========================================================================
  describe("1. Coordinator Tenancy & Scoped Queue Access", () => {
    it("should allow assigned coordinator (Coord 1) to access Course 1 grievance", async () => {
      const access = await verifyCoordinatorAccess(coordinator1Id, grievance1Id);
      assert.equal(access.allowed, true);
      assert.ok(access.grievance);
      assert.equal(access.grievance.courseId, course1Id);
    });

    it("should reject cross-course coordinator (Coord 2) attempting to access Course 1 grievance", async () => {
      const access = await verifyCoordinatorAccess(coordinator2Id, grievance1Id);
      assert.equal(access.allowed, false);
      assert.equal(access.statusCode, 403);
      assert.ok(access.error?.includes("not the active Course Coordinator assigned"));
    });

    it("should reject access when coordinator assignment is deactivated", async () => {
      // Deactivate Coord 1 assignment
      await prisma.staffAssignment.updateMany({
        where: { userId: coordinator1Id, courseId: course1Id },
        data: { isActive: false },
      });

      const access = await verifyCoordinatorAccess(coordinator1Id, grievance1Id);
      assert.equal(access.allowed, false);
      assert.equal(access.statusCode, 403);

      // Reactivate
      await prisma.staffAssignment.updateMany({
        where: { userId: coordinator1Id, courseId: course1Id },
        data: { isActive: true },
      });
    });
  });

  // ===========================================================================
  // 2. Workflow State Transitions & Invariant Enforcement
  // ===========================================================================
  describe("2. Workflow State Transitions & Precondition Guards", () => {
    const ctx = () => ({
      coordinatorUserId: coordinator1Id,
      grievanceId: grievance1Id,
    });

    it("should reject resolving a grievance that is still in SUBMITTED state", async () => {
      const res = await coordinatorResolveGrievance(
        ctx(),
        "Attempting premature resolution before reviewing."
      );
      assert.equal(res.success, false);
      assert.equal(res.statusCode, 400);
      assert.ok(res.error?.includes("Grievance must be UNDER_REVIEW"));
    });

    it("should mark SUBMITTED grievance as UNDER_REVIEW and log timeline milestone", async () => {
      const res = await coordinatorMarkUnderReview(ctx(), "Initiating faculty evaluation.");
      assert.equal(res.success, true);
      assert.ok(res.grievance);
      assert.equal(res.grievance.currentStatus, GrievanceStatus.UNDER_REVIEW);

      // Check timeline action
      const timeline = await prisma.grievanceTimelineAction.findFirst({
        where: {
          grievanceId: grievance1Id,
          actionType: TimelineActionType.UNDER_REVIEW_MARKED,
        },
      });
      assert.ok(timeline);
      assert.equal(timeline.visibility, TimelineVisibility.PUBLIC_TO_STUDENT);
      assert.equal(timeline.fromStatus, GrievanceStatus.SUBMITTED);
      assert.equal(timeline.toStatus, GrievanceStatus.UNDER_REVIEW);
    });

    it("should record confidential internal staff note with visibility INTERNAL_STAFF_ONLY", async () => {
      const res = await coordinatorAddInternalRemark(
        ctx(),
        "Consulted laboratory technician regarding attendance log."
      );
      assert.equal(res.success, true);

      // Verify internal note in database
      const internalNote = await prisma.grievanceTimelineAction.findFirst({
        where: {
          grievanceId: grievance1Id,
          actionType: TimelineActionType.INTERNAL_REMARK_ADDED,
          visibility: TimelineVisibility.INTERNAL_STAFF_ONLY,
        },
      });
      assert.ok(internalNote);
      assert.ok(internalNote.remarks?.includes("Consulted laboratory technician"));
    });

    it("should issue document request, move status to AWAITING_STUDENT_INFO, and record public timeline", async () => {
      const res = await coordinatorRequestDocuments(
        ctx(),
        "Please upload the signed lab experiment sheet with supervisor initials.",
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      assert.equal(res.success, true);
      assert.equal(res.grievance?.currentStatus, GrievanceStatus.AWAITING_STUDENT_INFO);

      // Verify DocumentRequest record exists
      const docReq = await prisma.documentRequest.findFirst({
        where: { grievanceId: grievance1Id },
      });
      assert.ok(docReq);
      assert.ok(docReq.instructions.includes("signed lab experiment sheet"));
      assert.equal(docReq.requestedTier, GrievanceTier.TIER_1_COORDINATOR);
    });

    it("should reject escalation to HoD while case is still in AWAITING_STUDENT_INFO state", async () => {
      const res = await coordinatorForwardToHod(
        ctx(),
        "Premature escalation while waiting for student info."
      );
      assert.equal(res.success, false);
      assert.equal(res.statusCode, 400);
      assert.ok(res.error?.includes("Grievance must be UNDER_REVIEW before escalating"));
    });

    it("should return case to UNDER_REVIEW when student fulfills clarification (simulated)", async () => {
      // Student fulfills document request
      await prisma.grievance.update({
        where: { id: grievance1Id },
        data: { currentStatus: GrievanceStatus.UNDER_REVIEW },
      });

      const updated = await prisma.grievance.findUnique({ where: { id: grievance1Id } });
      assert.equal(updated?.currentStatus, GrievanceStatus.UNDER_REVIEW);
    });

    it("should escalate case to Department Head (Tier 1 -> Tier 2), advance tier, and assign to active HoD", async () => {
      const res = await coordinatorForwardToHod(
        ctx(),
        "Evaluated laboratory registers; requires departmental committee intervention."
      );

      assert.equal(res.success, true);
      assert.ok(res.grievance);
      assert.equal(res.grievance.currentTier, GrievanceTier.TIER_2_HOD);
      assert.equal(res.grievance.currentStatus, GrievanceStatus.FORWARDED);
      assert.equal(res.grievance.assignedToUserId, hodId); // Reassigned to HoD

      // Verify both public handover timeline and confidential notes were created
      const publicForward = await prisma.grievanceTimelineAction.findFirst({
        where: {
          grievanceId: grievance1Id,
          actionType: TimelineActionType.FORWARDED,
          visibility: TimelineVisibility.PUBLIC_TO_STUDENT,
        },
      });
      assert.ok(publicForward);
      assert.equal(publicForward.toTier, GrievanceTier.TIER_2_HOD);

      const internalHandover = await prisma.grievanceTimelineAction.findFirst({
        where: {
          grievanceId: grievance1Id,
          actionType: TimelineActionType.INTERNAL_REMARK_ADDED,
          visibility: TimelineVisibility.INTERNAL_STAFF_ONLY,
          remarks: { contains: "Tier-1 Coordinator Escalation Handover" },
        },
      });
      assert.ok(internalHandover);
    });

    it("should reject coordinator performing further actions once case is escalated to HoD (Tier 2)", async () => {
      const res = await coordinatorResolveGrievance(
        ctx(),
        "Attempting resolution after escalating to HoD."
      );
      assert.equal(res.success, false);
      assert.equal(res.statusCode, 400);
      assert.ok(res.error?.includes("Grievance is currently at TIER_2_HOD"));
    });
  });
});
