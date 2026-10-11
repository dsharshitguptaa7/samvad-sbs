import "dotenv/config";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/lib/prisma";
import { UserRole, GrievanceCategory, GrievanceStatus, GrievanceTier } from "@prisma/client";
import {
  resolveAuthorityChain,
  validateSchoolAuthorityMatrix,
  assignmentMatchesSemester,
} from "../src/lib/routing/authority-chain";
import { createStudentGrievance } from "../src/lib/grievance/submission";
import {
  verifyCoordinatorAccess,
  coordinatorMarkUnderReview,
} from "../src/lib/coordinator/workflow";

describe("SAMVAD: Semester-Wise Course Coordinator Assignment & Grievance Routing", () => {
  // Test Identifiers
  const testDeptCode = "TEST_DEPT_SEMROUTING";
  const testDeptName = "Department of Applied Mathematics & Computing";

  const ugCourseCode = "BSCMATH_SEM";
  const ugCourseName = "B.Sc. Mathematics & Computing";

  const pgCourseCode = "MSCDATA_SEM";
  const pgCourseName = "M.Sc. Data Science & Analytics";

  const emailCoordA = "dr.sharma.sem12@csjmu.ac.in";
  const emailCoordB = "dr.verma.sem34@csjmu.ac.in";
  const emailCoordC = "dr.gupta.sem56@csjmu.ac.in";
  const emailCoordPG = "dr.mishra.pgodd@csjmu.ac.in";
  const emailHod = "dr.singh.hod.sem@csjmu.ac.in";
  const emailStudent = "student.ananya.sem@csjmu.ac.in";

  let deptId = "";
  let ugCourseId = "";
  let pgCourseId = "";

  let coordAId = "";
  let coordBId = "";
  let coordCId = "";
  let coordPGId = "";
  let hodUserId = "";
  let studentUserId = "";

  before(async () => {
    // 1. Clean up any previous test state
    const existingUsers = await prisma.user.findMany({
      where: {
        email: {
          in: [
            emailCoordA,
            emailCoordB,
            emailCoordC,
            emailCoordPG,
            emailHod,
            emailStudent,
          ],
        },
      },
      select: { id: true },
    });

    if (existingUsers.length > 0) {
      const uIds = existingUsers.map((u) => u.id);
      await prisma.grievanceTimelineAction.deleteMany({ where: { actorId: { in: uIds } } });
      await prisma.grievance.deleteMany({ where: { studentId: { in: uIds } } });
      await prisma.staffAssignment.deleteMany({ where: { userId: { in: uIds } } });
      await prisma.session.deleteMany({ where: { userId: { in: uIds } } });
      await prisma.user.deleteMany({ where: { id: { in: uIds } } });
    }

    const existingDepts = await prisma.department.findMany({
      where: { code: testDeptCode },
      select: { id: true },
    });

    for (const d of existingDepts) {
      const courses = await prisma.course.findMany({ where: { departmentId: d.id }, select: { id: true } });
      const cIds = courses.map((c) => c.id);
      await prisma.grievance.deleteMany({ where: { courseId: { in: cIds } } });
      await prisma.staffAssignment.deleteMany({ where: { departmentId: d.id } });
      await prisma.course.deleteMany({ where: { departmentId: d.id } });
      await prisma.department.delete({ where: { id: d.id } });
    }

    // 2. Create Test Department
    const dept = await prisma.department.create({
      data: {
        name: testDeptName,
        code: testDeptCode,
        isActive: true,
      },
    });
    deptId = dept.id;

    // 3. Create Undergraduate Course (6 Semesters, B.Sc.)
    const ugCourse = await prisma.course.create({
      data: {
        name: ugCourseName,
        code: ugCourseCode,
        departmentId: dept.id,
        programType: "Undergraduate (3 Years)",
        totalSemesters: 6,
        academicPeriod: "ALL",
        isActive: true,
      },
    });
    ugCourseId = ugCourse.id;

    // 4. Create Postgraduate Course (4 Semesters, M.Sc.)
    const pgCourse = await prisma.course.create({
      data: {
        name: pgCourseName,
        code: pgCourseCode,
        departmentId: dept.id,
        programType: "Postgraduate (2 Years)",
        totalSemesters: 4,
        academicPeriod: "ODD",
        isActive: true,
      },
    });
    pgCourseId = pgCourse.id;

    // 5. Create Coordinator Users
    const coordA = await prisma.user.create({
      data: {
        fullName: "Dr. A. Sharma (Sem 1 & 2)",
        email: emailCoordA,
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.COURSE_COORDINATOR,
        isActive: true,
      },
    });
    coordAId = coordA.id;

    const coordB = await prisma.user.create({
      data: {
        fullName: "Dr. B. Verma (Sem 3 & 4)",
        email: emailCoordB,
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.COURSE_COORDINATOR,
        isActive: true,
      },
    });
    coordBId = coordB.id;

    const coordC = await prisma.user.create({
      data: {
        fullName: "Dr. C. Gupta (Sem 5 & 6)",
        email: emailCoordC,
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.COURSE_COORDINATOR,
        isActive: true,
      },
    });
    coordCId = coordC.id;

    const coordPG = await prisma.user.create({
      data: {
        fullName: "Dr. D. Mishra (PG Sem 1 & 3)",
        email: emailCoordPG,
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.COURSE_COORDINATOR,
        isActive: true,
      },
    });
    coordPGId = coordPG.id;

    // 6. Create Department Head
    const hod = await prisma.user.create({
      data: {
        fullName: "Prof. E. Singh (HoD)",
        email: emailHod,
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.DEPARTMENT_HEAD,
        isActive: true,
      },
    });
    hodUserId = hod.id;

    await prisma.staffAssignment.create({
      data: {
        userId: hod.id,
        role: UserRole.DEPARTMENT_HEAD,
        departmentId: dept.id,
        courseId: null,
        isActive: true,
      },
    });

    // 7. Ensure an active Director exists
    const existingDirector = await prisma.user.findFirst({
      where: { role: UserRole.DIRECTOR, isActive: true },
    });
    if (!existingDirector) {
      await prisma.user.create({
        data: {
          fullName: "Prof. R. Director",
          email: "director.sbs.autotest@csjmu.ac.in",
          passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
          role: UserRole.DIRECTOR,
          isActive: true,
        },
      });
    }

    // 8. Create Student
    const student = await prisma.user.create({
      data: {
        fullName: "Ananya Patel",
        email: emailStudent,
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STUDENT,
        rollNumber: "CSJMU26MATH001",
        enrollmentNo: "ENR26001MATH",
        isActive: true,
      },
    });
    studentUserId = student.id;

    // 9. Assign Coordinators to B.Sc. course:
    // Coordinator A -> Semesters 1, 2
    await prisma.staffAssignment.create({
      data: {
        userId: coordA.id,
        role: UserRole.COURSE_COORDINATOR,
        departmentId: dept.id,
        courseId: ugCourse.id,
        semesters: [1, 2],
        isActive: true,
      },
    });

    // Coordinator B -> Semesters 3, 4
    await prisma.staffAssignment.create({
      data: {
        userId: coordB.id,
        role: UserRole.COURSE_COORDINATOR,
        departmentId: dept.id,
        courseId: ugCourse.id,
        semesters: [3, 4],
        isActive: true,
      },
    });

    // Coordinator C -> Semesters 5, 6
    await prisma.staffAssignment.create({
      data: {
        userId: coordC.id,
        role: UserRole.COURSE_COORDINATOR,
        departmentId: dept.id,
        courseId: ugCourse.id,
        semesters: [5, 6],
        isActive: true,
      },
    });

    // 10. Assign Coordinator PG to M.Sc. course:
    // Coordinator PG -> Semesters 1, 3 (Odd group)
    await prisma.staffAssignment.create({
      data: {
        userId: coordPG.id,
        role: UserRole.COURSE_COORDINATOR,
        departmentId: dept.id,
        courseId: pgCourse.id,
        semesters: [1, 3],
        academicPeriod: "ODD",
        isActive: true,
      },
    });
  });

  after(async () => {
    // Teardown test records
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: [
            emailCoordA,
            emailCoordB,
            emailCoordC,
            emailCoordPG,
            emailHod,
            emailStudent,
          ],
        },
      },
      select: { id: true },
    });
    const uIds = users.map((u) => u.id);

    await prisma.grievanceTimelineAction.deleteMany({ where: { actorId: { in: uIds } } });
    await prisma.grievance.deleteMany({ where: { studentId: { in: uIds } } });
    await prisma.staffAssignment.deleteMany({ where: { departmentId: deptId } });
    await prisma.session.deleteMany({ where: { userId: { in: uIds } } });
    await prisma.user.deleteMany({ where: { id: { in: uIds } } });
    await prisma.course.deleteMany({ where: { departmentId: deptId } });
    await prisma.department.deleteMany({ where: { id: deptId } });
  });

  it("1. assignmentMatchesSemester correctly evaluates semester memberships and academic periods", () => {
    // Array matching
    assert.strictEqual(assignmentMatchesSemester({ semesters: [1, 2] }, 1), true);
    assert.strictEqual(assignmentMatchesSemester({ semesters: [1, 2] }, 2), true);
    assert.strictEqual(assignmentMatchesSemester({ semesters: [1, 2] }, 3), false);

    // Academic Period matching
    assert.strictEqual(assignmentMatchesSemester({ semesters: [], academicPeriod: "ODD" }, 1), true);
    assert.strictEqual(assignmentMatchesSemester({ semesters: [], academicPeriod: "ODD" }, 2), false);
    assert.strictEqual(assignmentMatchesSemester({ semesters: [], academicPeriod: "ODD" }, 5), true);
    assert.strictEqual(assignmentMatchesSemester({ semesters: [], academicPeriod: "EVEN" }, 4), true);
    assert.strictEqual(assignmentMatchesSemester({ semesters: [], academicPeriod: "EVEN" }, 3), false);

    // All semesters matching (empty array with ALL or null)
    assert.strictEqual(assignmentMatchesSemester({ semesters: [], academicPeriod: "ALL" }, 4), true);
    assert.strictEqual(assignmentMatchesSemester({ semesters: [] }, 6), true);
  });

  it("2. Semester 1 routes to its designated coordinator (Dr. A. Sharma)", async () => {
    const chain = await resolveAuthorityChain(ugCourseId, 1);

    assert.strictEqual(chain.isComplete, true);
    assert.strictEqual(chain.status, "COMPLETE");
    assert.ok(chain.coordinator, "Coordinator must be resolved for Semester 1");
    assert.strictEqual(chain.coordinator?.userId, coordAId);
    assert.strictEqual(chain.departmentHead?.userId, hodUserId);
    assert.ok(chain.director, "Director must be present");
  });

  it("3. Semester 3 routes to its designated coordinator (Dr. B. Verma)", async () => {
    const chain = await resolveAuthorityChain(ugCourseId, 3);

    assert.strictEqual(chain.isComplete, true);
    assert.strictEqual(chain.status, "COMPLETE");
    assert.ok(chain.coordinator, "Coordinator must be resolved for Semester 3");
    assert.strictEqual(chain.coordinator?.userId, coordBId);
  });

  it("4. Even-semester routing operates independently (Semester 4 -> B, Semester 6 -> C)", async () => {
    const chainSem4 = await resolveAuthorityChain(ugCourseId, 4);
    assert.strictEqual(chainSem4.coordinator?.userId, coordBId);
    assert.strictEqual(chainSem4.isComplete, true);

    const chainSem6 = await resolveAuthorityChain(ugCourseId, 6);
    assert.strictEqual(chainSem6.coordinator?.userId, coordCId);
    assert.strictEqual(chainSem6.isComplete, true);
  });

  it("5. Comprehensive Course Routing Matrix shows all 6 semesters assigned with no conflicts", async () => {
    const chain = await resolveAuthorityChain(ugCourseId);

    assert.strictEqual(chain.isComplete, true);
    assert.strictEqual(chain.totalSemesters, 6);
    assert.strictEqual(chain.semesterRouting.length, 6);

    const sem1 = chain.semesterRouting.find((s) => s.semester === 1);
    const sem2 = chain.semesterRouting.find((s) => s.semester === 2);
    const sem3 = chain.semesterRouting.find((s) => s.semester === 3);
    const sem4 = chain.semesterRouting.find((s) => s.semester === 4);
    const sem5 = chain.semesterRouting.find((s) => s.semester === 5);
    const sem6 = chain.semesterRouting.find((s) => s.semester === 6);

    assert.strictEqual(sem1?.status, "ASSIGNED");
    assert.strictEqual(sem1?.coordinator?.userId, coordAId);

    assert.strictEqual(sem2?.status, "ASSIGNED");
    assert.strictEqual(sem2?.coordinator?.userId, coordAId);

    assert.strictEqual(sem3?.status, "ASSIGNED");
    assert.strictEqual(sem3?.coordinator?.userId, coordBId);

    assert.strictEqual(sem4?.status, "ASSIGNED");
    assert.strictEqual(sem4?.coordinator?.userId, coordBId);

    assert.strictEqual(sem5?.status, "ASSIGNED");
    assert.strictEqual(sem5?.coordinator?.userId, coordCId);

    assert.strictEqual(sem6?.status, "ASSIGNED");
    assert.strictEqual(sem6?.coordinator?.userId, coordCId);
  });

  it("6. Postgraduate Course (4 Semesters): odd semesters route, unassigned semesters report MISSING", async () => {
    // PG course has totalSemesters = 4, Coord PG assigned to [1, 3]
    const chainSem1 = await resolveAuthorityChain(pgCourseId, 1);
    assert.strictEqual(chainSem1.coordinator?.userId, coordPGId);
    assert.strictEqual(chainSem1.isComplete, true);

    const chainSem3 = await resolveAuthorityChain(pgCourseId, 3);
    assert.strictEqual(chainSem3.coordinator?.userId, coordPGId);
    assert.strictEqual(chainSem3.isComplete, true);

    // Semester 2 has no coordinator assigned
    const chainSem2 = await resolveAuthorityChain(pgCourseId, 2);
    assert.strictEqual(chainSem2.coordinator, null);
    assert.strictEqual(chainSem2.isComplete, false);
    assert.ok(chainSem2.issues.some((i) => i.includes("No active Course Coordinator assigned for semester 2")));

    // General PG matrix should detect missing even semesters (2 and 4)
    const pgMatrix = await resolveAuthorityChain(pgCourseId);
    assert.strictEqual(pgMatrix.totalSemesters, 4);
    assert.strictEqual(pgMatrix.semesterRouting.length, 4);
    assert.strictEqual(pgMatrix.isComplete, false);

    const missingSems = pgMatrix.semesterRouting.filter((sr) => sr.status === "MISSING");
    assert.strictEqual(missingSems.length, 2);
    assert.deepStrictEqual(missingSems.map((s) => s.semester), [2, 4]);
  });

  it("7. Invalid semester combinations are rejected by authority resolver and grievance submission", async () => {
    // Sem 7 on a 6-semester UG course
    const chainInvalid = await resolveAuthorityChain(ugCourseId, 7);
    assert.strictEqual(chainInvalid.coordinator, null);
    assert.strictEqual(chainInvalid.isComplete, false);
    assert.ok(chainInvalid.issues.some((i) => i.includes("Invalid semester 7")));

    // Sem 5 on a 4-semester PG course
    const chainPgInvalid = await resolveAuthorityChain(pgCourseId, 5);
    assert.strictEqual(chainPgInvalid.coordinator, null);
    assert.ok(chainPgInvalid.issues.some((i) => i.includes("Invalid semester 5")));

    // Grievance submission with semester > totalSemesters fails safely
    const subResult = await createStudentGrievance({
      studentId: studentUserId,
      courseId: ugCourseId,
      semester: 8,
      category: GrievanceCategory.ACADEMIC,
      subject: "Test grievance with out-of-bounds semester",
      description: "Detailed description of out of bounds grievance test.",
    });

    assert.strictEqual(subResult.success, false);
    assert.strictEqual(subResult.errorCode, "INVALID_COURSE");
    assert.ok(subResult.error?.includes("Invalid semester 8"));
  });

  it("8. Missing or inactive coordinator assignments fail safely (UNRESOLVED_ROUTING)", async () => {
    // Attempting to lodge grievance for Semester 2 of PG course (unassigned)
    const subResult = await createStudentGrievance({
      studentId: studentUserId,
      courseId: pgCourseId,
      semester: 2,
      category: GrievanceCategory.EXAMINATION,
      subject: "Evaluation delay in PG Semester 2",
      description: "Description of evaluation delay in PG Semester 2 for unassigned coordinator.",
    });

    assert.strictEqual(subResult.success, false);
    assert.strictEqual(subResult.errorCode, "UNRESOLVED_ROUTING");
    assert.ok(subResult.error?.includes("No active Course Coordinator assigned for semester 2"));
  });

  it("9. Conflicting assignments are detected and fail resolution safely", async () => {
    // Intentionally create a second active coordinator covering semester 1 of UG course
    const conflictAssignment = await prisma.staffAssignment.create({
      data: {
        userId: coordBId,
        role: UserRole.COURSE_COORDINATOR,
        departmentId: deptId,
        courseId: ugCourseId,
        semesters: [1],
        isActive: true,
      },
    });

    try {
      const chain = await resolveAuthorityChain(ugCourseId, 1);
      assert.strictEqual(chain.coordinator, null, "Coordinator must be null on conflict");
      assert.strictEqual(chain.isComplete, false);

      const sem1Node = chain.semesterRouting.find((s) => s.semester === 1);
      assert.strictEqual(sem1Node?.status, "CONFLICT");
      assert.strictEqual(sem1Node?.candidates?.length, 2);
      assert.ok(chain.issues.some((i) => i.includes("Ambiguous configuration: 2 active coordinators")));
    } finally {
      // Clean up the artificial conflict
      await prisma.staffAssignment.delete({ where: { id: conflictAssignment.id } });
    }
  });

  it("10. Student grievance lodging records semester and assigns responsible coordinator atomically", async () => {
    // Lodge for UG course, Semester 1 -> should assign Coordinator A
    const sub1 = await createStudentGrievance({
      studentId: studentUserId,
      courseId: ugCourseId,
      semester: 1,
      category: GrievanceCategory.ACADEMIC,
      subject: "Chemistry lab timetable conflict in Semester 1",
      description: "Detailed description of laboratory timetable conflict for first semester students.",
    });

    assert.strictEqual(sub1.success, true);
    assert.ok(sub1.grievance);
    assert.strictEqual(sub1.grievance?.semester, 1);
    assert.strictEqual(sub1.grievance?.assignedToUserId, coordAId);
    assert.strictEqual(sub1.grievance?.currentTier, GrievanceTier.TIER_1_COORDINATOR);
    assert.strictEqual(sub1.grievance?.currentStatus, GrievanceStatus.SUBMITTED);

    // Lodge for UG course, Semester 3 -> should assign Coordinator B
    const sub3 = await createStudentGrievance({
      studentId: studentUserId,
      courseId: ugCourseId,
      semester: 3,
      category: GrievanceCategory.EXAMINATION,
      subject: "Discrepancy in Continuous Assessment marks Sem 3",
      description: "Detailed description regarding continuous assessment scores in third semester.",
    });

    assert.strictEqual(sub3.success, true);
    assert.ok(sub3.grievance);
    assert.strictEqual(sub3.grievance?.semester, 3);
    assert.strictEqual(sub3.grievance?.assignedToUserId, coordBId);
  });

  it("11. Coordinator access boundary: Cross-semester access attempts are strictly rejected (403)", async () => {
    // Create grievance for Semester 1 (assigned to Coord A)
    const subResult = await createStudentGrievance({
      studentId: studentUserId,
      courseId: ugCourseId,
      semester: 1,
      category: GrievanceCategory.ADMINISTRATIVE,
      subject: "Identity card verification delay Semester 1",
      description: "Detailed grievance regarding ID card verification delay for semester 1.",
    });

    assert.strictEqual(subResult.success, true);
    const grievanceId = subResult.grievance!.id;

    // Coordinator A (covers Sem 1 & 2): Allowed
    const accessA = await verifyCoordinatorAccess(coordAId, grievanceId);
    assert.strictEqual(accessA.allowed, true);
    assert.ok(accessA.grievance);

    // Coordinator B (covers Sem 3 & 4): DENIED (403)
    const accessB = await verifyCoordinatorAccess(coordBId, grievanceId);
    assert.strictEqual(accessB.allowed, false);
    assert.strictEqual(accessB.statusCode, 403);
    assert.ok(accessB.error?.includes("You are not assigned as Course Coordinator for semester 1"));

    // Coordinator C (covers Sem 5 & 6): DENIED (403)
    const accessC = await verifyCoordinatorAccess(coordCId, grievanceId);
    assert.strictEqual(accessC.allowed, false);
    assert.strictEqual(accessC.statusCode, 403);

    // Cross-semester mutation rejection: Coord B attempts to Mark Under Review on Sem 1 grievance
    const actionResult = await coordinatorMarkUnderReview({
      coordinatorUserId: coordBId,
      grievanceId,
    });

    assert.strictEqual(actionResult.success, false);
    assert.strictEqual(actionResult.statusCode, 403);
    assert.ok(actionResult.error?.includes("semester 1"));

    // Authorized mutation: Coord A marks under review
    const validAction = await coordinatorMarkUnderReview({
      coordinatorUserId: coordAId,
      grievanceId,
    });
    assert.strictEqual(validAction.success, true);
    assert.strictEqual(validAction.grievance?.currentStatus, GrievanceStatus.UNDER_REVIEW);
  });

  it("12. Historical grievance routing & audit records are preserved after reassignment", async () => {
    // Lodge grievance for UG course, Semester 5 -> assigned to Coord C
    const subResult = await createStudentGrievance({
      studentId: studentUserId,
      courseId: ugCourseId,
      semester: 5,
      category: GrievanceCategory.LABORATORY,
      subject: "Advanced computing lab equipment maintenance",
      description: "Detailed description of computing laboratory equipment issues in Semester 5.",
    });

    assert.strictEqual(subResult.success, true);
    const grievanceId = subResult.grievance!.id;

    // Simulate Admin unassigning Coordinator C from semesters 5 & 6
    await prisma.staffAssignment.updateMany({
      where: {
        userId: coordCId,
        courseId: ugCourseId,
      },
      data: {
        isActive: false,
        unassignedAt: new Date(),
      },
    });

    // Verify historical grievance record preserves assignedToUserId and semester
    const persistedGrievance = await prisma.grievance.findUnique({
      where: { id: grievanceId },
    });

    assert.strictEqual(persistedGrievance?.assignedToUserId, coordCId);
    assert.strictEqual(persistedGrievance?.semester, 5);

    // Verify timeline records remain intact
    const timeline = await prisma.grievanceTimelineAction.findMany({
      where: { grievanceId },
      orderBy: { createdAt: "asc" },
    });

    assert.ok(timeline.length >= 1);
    assert.strictEqual(timeline[0].actionType, "SUBMITTED");
    assert.ok(timeline[0].remarks?.includes("Dr. C. Gupta"));
  });

  it("13. Admin Semester Matrix: loads all courses with configured totalSemesters and coordinator mappings", async () => {
    // Re-activate Coordinator C for full coverage verification
    await prisma.staffAssignment.updateMany({
      where: {
        userId: coordCId,
        courseId: ugCourseId,
      },
      data: {
        isActive: true,
        unassignedAt: null,
      },
    });

    const chain = await resolveAuthorityChain(ugCourseId);
    assert.strictEqual(chain.totalSemesters, 6);
    assert.ok(Array.isArray(chain.semesterRouting));
    assert.strictEqual(chain.semesterRouting.length, 6);

    // Verify all 6 semesters are accounted for
    const semStatuses = chain.semesterRouting.map((s) => ({
      sem: s.semester,
      status: s.status,
      coordinator: s.coordinator?.fullName,
    }));

    // Sem 1 & 2 -> Dr. A. Sharma (coordAId)
    assert.strictEqual(semStatuses[0].sem, 1);
    assert.strictEqual(semStatuses[0].status, "ASSIGNED");
    assert.ok(semStatuses[0].coordinator?.includes("Dr. A. Sharma"));

    // Sem 3 & 4 -> Dr. B. Verma (coordBId)
    assert.strictEqual(semStatuses[2].sem, 3);
    assert.strictEqual(semStatuses[2].status, "ASSIGNED");
    assert.ok(semStatuses[2].coordinator?.includes("Dr. B. Verma"));

    // Sem 5 & 6 -> Dr. C. Gupta (coordCId)
    assert.strictEqual(semStatuses[4].sem, 5);
    assert.strictEqual(semStatuses[4].status, "ASSIGNED");
    assert.ok(semStatuses[4].coordinator?.includes("Dr. C. Gupta"));
  });

  it("14. Admin Semester Matrix: accurately detects missing semesters and conflict states", async () => {
    // Temporarily unassign Coordinator B (semesters 3 & 4 become MISSING)
    await prisma.staffAssignment.updateMany({
      where: {
        userId: coordBId,
        courseId: ugCourseId,
      },
      data: {
        isActive: false,
        unassignedAt: new Date(),
      },
    });

    const chainMissing = await resolveAuthorityChain(ugCourseId);
    const sem3 = chainMissing.semesterRouting.find((s) => s.semester === 3);
    const sem4 = chainMissing.semesterRouting.find((s) => s.semester === 4);
    assert.strictEqual(sem3?.status, "MISSING");
    assert.strictEqual(sem4?.status, "MISSING");
    assert.strictEqual(sem3?.coordinator, null);

    // Restore Coordinator B
    await prisma.staffAssignment.updateMany({
      where: {
        userId: coordBId,
        courseId: ugCourseId,
      },
      data: {
        isActive: true,
        unassignedAt: null,
      },
    });
  });
});
