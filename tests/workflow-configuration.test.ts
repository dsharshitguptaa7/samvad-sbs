import "dotenv/config";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/lib/prisma";
import {
  UserRole,
  GrievanceCategory,
  GrievanceStatus,
  GrievanceTier,
  WorkflowMode,
} from "@prisma/client";
import {
  getActiveWorkflowConfiguration,
  updateWorkflowConfiguration,
  validateWorkflowReadiness,
  getWorkflowAuditHistory,
} from "../src/lib/workflow/configuration";
import { createStudentGrievance } from "../src/lib/grievance/submission";
import { hodMarkUnderReview, hodResolveGrievance, hodForwardToDirector } from "../src/lib/escalation/workflow";

describe("SAMVAD: Admin-Controlled Workflow Configuration & Historical Routing", () => {
  // Test Identifiers
  const adminEmail = "admin.wf.test@csjmu.ac.in";
  const studentEmail = "student.wf.test@csjmu.ac.in";
  const coordEmail = "coord.wf.test@csjmu.ac.in";
  const hodEmail = "hod.wf.test@csjmu.ac.in";
  const directorEmail = "director.wf.test@csjmu.ac.in";

  const deptCode = "TEST_WF_DEPT";
  const courseCode = "TEST_WF_CRS";

  let adminId = "";
  let studentId = "";
  let coordId = "";
  let hodId = "";
  let directorId = "";
  let deptId = "";
  let courseId = "";

  async function cleanupTestData() {
    try {
      const users = await prisma.user.findMany({
        where: {
          email: {
            in: [adminEmail, studentEmail, coordEmail, hodEmail, directorEmail],
          },
        },
      });
      const userIds = users.map((u) => u.id);

      if (userIds.length > 0) {
        // Find grievances created by test students
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

        await prisma.workflowAuditLog.deleteMany({ where: { adminUserId: { in: userIds } } });
        await prisma.systemAuditLog.deleteMany({ where: { adminUserId: { in: userIds } } });
        await prisma.staffAssignment.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }

      // Cleanup department and course
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
      console.error("Cleanup error in workflow configuration test:", e);
    }
  }

  before(async () => {
    await cleanupTestData();

    // 1. Create Department & Course
    const dept = await prisma.department.create({
      data: {
        name: "Test Workflow Department",
        code: deptCode,
        isActive: true,
      },
    });
    deptId = dept.id;

    const course = await prisma.course.create({
      data: {
        name: "Test Workflow Course",
        code: courseCode,
        departmentId: dept.id,
        totalSemesters: 4,
        isActive: true,
      },
    });
    courseId = course.id;

    // 2. Create Users
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        fullName: "Test System Administrator",
        passwordHash: "hash123",
        role: UserRole.SYSTEM_ADMIN,
        isActive: true,
      },
    });
    adminId = admin.id;

    const student = await prisma.user.create({
      data: {
        email: studentEmail,
        fullName: "Test Workflow Student",
        passwordHash: "hash123",
        role: UserRole.STUDENT,
        rollNumber: "TEST-WF-ROLL-01",
        enrollmentNo: "TEST-WF-ENR-01",
        isActive: true,
      },
    });
    studentId = student.id;

    const coord = await prisma.user.create({
      data: {
        email: coordEmail,
        fullName: "Test Course Coordinator",
        passwordHash: "hash123",
        role: UserRole.COURSE_COORDINATOR,
        isActive: true,
      },
    });
    coordId = coord.id;

    const hod = await prisma.user.create({
      data: {
        email: hodEmail,
        fullName: "Test Department Head",
        passwordHash: "hash123",
        role: UserRole.DEPARTMENT_HEAD,
        isActive: true,
      },
    });
    hodId = hod.id;

    const director = await prisma.user.create({
      data: {
        email: directorEmail,
        fullName: "Test School Director",
        passwordHash: "hash123",
        role: UserRole.DIRECTOR,
        isActive: true,
      },
    });
    directorId = director.id;

    // 3. Assign HoD to department
    await prisma.staffAssignment.create({
      data: {
        userId: hod.id,
        role: UserRole.DEPARTMENT_HEAD,
        departmentId: dept.id,
        courseId: null,
        isActive: true,
      },
    });
  });

  after(async () => {
    // Reset global workflow configuration to HOD_DIRECTOR default
    await prisma.workflowConfiguration.upsert({
      where: { key: "DEFAULT" },
      update: { mode: WorkflowMode.HOD_DIRECTOR, changeReason: "Test cleanup restore" },
      create: { key: "DEFAULT", mode: WorkflowMode.HOD_DIRECTOR, version: 1 },
    });
    await cleanupTestData();
  });

  it("1. Durable Initialization: Configuration defaults to HOD_DIRECTOR mode", async () => {
    const config = await getActiveWorkflowConfiguration();
    assert.ok(config);
    assert.strictEqual(config.key, "DEFAULT");
    assert.ok(
      config.mode === WorkflowMode.HOD_DIRECTOR ||
      config.mode === WorkflowMode.COORDINATOR_HOD_DIRECTOR
    );
    assert.ok(config.version >= 1);
  });

  it("2. Initial HOD-direct workflow: Grievance routes directly to Department Head", async () => {
    // Ensure active mode is HOD_DIRECTOR
    await prisma.workflowConfiguration.update({
      where: { key: "DEFAULT" },
      data: { mode: WorkflowMode.HOD_DIRECTOR },
    });

    const result = await createStudentGrievance({
      studentId,
      courseId,
      semester: 1, // Coordinator is NOT assigned to semester 1, but HOD mode must NOT block
      category: GrievanceCategory.ACADEMIC,
      subject: "Direct HOD routing test",
      description: "Testing direct routing to HoD under HOD_DIRECTOR mode.",
    });

    assert.strictEqual(result.success, true, `Submission failed: ${result.error}`);
    assert.ok(result.grievance);
    assert.strictEqual(result.grievance.currentTier, GrievanceTier.TIER_2_HOD);
    assert.strictEqual(result.grievance.currentStatus, GrievanceStatus.SUBMITTED);
    assert.strictEqual(result.grievance.assignedToUserId, hodId);
    assert.strictEqual(result.grievance.workflowMode, WorkflowMode.HOD_DIRECTOR);
    assert.strictEqual(result.grievance.semester, 1);

    // Verify timeline action
    const timeline = await prisma.grievanceTimelineAction.findFirst({
      where: { grievanceId: result.grievance.id },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(timeline);
    assert.strictEqual(timeline.toTier, GrievanceTier.TIER_2_HOD);
    assert.ok(timeline.remarks?.includes("Routed directly to Department Head"));
  });

  it("3. Missing HOD case in HOD_DIRECTOR mode: Safely rejected with UNRESOLVED_ROUTING", async () => {
    // Temporarily deactivate HoD assignment
    await prisma.staffAssignment.updateMany({
      where: { departmentId: deptId, role: UserRole.DEPARTMENT_HEAD },
      data: { isActive: false },
    });

    const result = await createStudentGrievance({
      studentId,
      courseId,
      semester: 2,
      category: GrievanceCategory.ADMINISTRATIVE,
      subject: "Missing HoD test",
      description: "Should fail gracefully due to missing HoD.",
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.errorCode, "UNRESOLVED_ROUTING");
    assert.ok(result.error?.includes("No active Department Head assigned"));

    // Restore HoD assignment
    await prisma.staffAssignment.updateMany({
      where: { departmentId: deptId, role: UserRole.DEPARTMENT_HEAD },
      data: { isActive: true },
    });
  });

  it("4. Role-based restrictions: Non-admin users cannot update workflow configuration", async () => {
    const studentUpdate = await updateWorkflowConfiguration(studentId, {
      mode: WorkflowMode.COORDINATOR_HOD_DIRECTOR,
      reason: "Unauthorized student attempt",
    });
    assert.strictEqual(studentUpdate.success, false);
    assert.strictEqual(studentUpdate.statusCode, 403);

    const coordUpdate = await updateWorkflowConfiguration(coordId, {
      mode: WorkflowMode.COORDINATOR_HOD_DIRECTOR,
      reason: "Unauthorized coordinator attempt",
    });
    assert.strictEqual(coordUpdate.success, false);
    assert.strictEqual(coordUpdate.statusCode, 403);
  });

  it("5. Readiness validation blocks activation of COORDINATOR mode if coordinators missing", async () => {
    // Currently test course has no coordinator assigned
    const updateResult = await updateWorkflowConfiguration(adminId, {
      mode: WorkflowMode.COORDINATOR_HOD_DIRECTOR,
      reason: "Attempting activation with unassigned coordinators",
    });

    assert.strictEqual(updateResult.success, false);
    assert.strictEqual(updateResult.statusCode, 422);
    assert.ok(updateResult.issues && updateResult.issues.length > 0);
    assert.ok(updateResult.error?.includes("mandatory authority prerequisites are incomplete"));
  });

  it("6. Mode Switching: Admin activates COORDINATOR_HOD_DIRECTOR after assigning coordinators", async () => {
    // Assign coordinator to all semesters of test course
    await prisma.staffAssignment.create({
      data: {
        userId: coordId,
        role: UserRole.COURSE_COORDINATOR,
        departmentId: deptId,
        courseId,
        semesters: [], // [] covers all semesters
        isActive: true,
      },
    });

    const currentConfig = await getActiveWorkflowConfiguration();
    const updateResult = await updateWorkflowConfiguration(adminId, {
      mode: WorkflowMode.COORDINATOR_HOD_DIRECTOR,
      reason: "Activating semester coordinator workflow for school term.",
      expectedVersion: currentConfig.version,
      skipReadinessCheck: true,
    });

    assert.strictEqual(updateResult.success, true, `Update failed: ${updateResult.error}`);
    assert.ok(updateResult.configuration);
    assert.strictEqual(updateResult.configuration.mode, WorkflowMode.COORDINATOR_HOD_DIRECTOR);
    assert.strictEqual(updateResult.configuration.version, currentConfig.version + 1);

    // Verify audit logs
    const auditLogs = await getWorkflowAuditHistory(5);
    const latestAudit = auditLogs.find((l) => l.newMode === WorkflowMode.COORDINATOR_HOD_DIRECTOR);
    assert.ok(latestAudit);
    assert.strictEqual(latestAudit.previousMode, WorkflowMode.HOD_DIRECTOR);
    assert.strictEqual(latestAudit.reason, "Activating semester coordinator workflow for school term.");
    assert.strictEqual(latestAudit.adminEmail, adminEmail);
  });

  it("7. Concurrent configuration updates: Optimistic concurrency rejects outdated version", async () => {
    const staleVersion = 99999;
    const conflictResult = await updateWorkflowConfiguration(adminId, {
      mode: WorkflowMode.HOD_DIRECTOR,
      reason: "Concurrent conflicting update attempt",
      expectedVersion: staleVersion,
    });

    assert.strictEqual(conflictResult.success, false);
    assert.strictEqual(conflictResult.statusCode, 409);
    assert.ok(conflictResult.error?.includes("version mismatch"));
  });

  it("8. COORDINATOR mode routing: New grievances route to Tier 1 Course Coordinator", async () => {
    const result = await createStudentGrievance({
      studentId,
      courseId,
      semester: 1,
      category: GrievanceCategory.EXAMINATION,
      subject: "Tier 1 Coordinator grievance test",
      description: "Lodging grievance under active COORDINATOR_HOD_DIRECTOR mode.",
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.grievance);
    assert.strictEqual(result.grievance.currentTier, GrievanceTier.TIER_1_COORDINATOR);
    assert.strictEqual(result.grievance.currentStatus, GrievanceStatus.SUBMITTED);
    assert.strictEqual(result.grievance.assignedToUserId, coordId);
    assert.strictEqual(result.grievance.workflowMode, WorkflowMode.COORDINATOR_HOD_DIRECTOR);
  });

  it("9. Historical Workflow Preservation: Existing grievances retain their original routing", async () => {
    // We have:
    // Grievance A created in test 2 (HOD_DIRECTOR mode, currentTier: TIER_2_HOD, assigned: hodId)
    // Grievance B created in test 8 (COORDINATOR_HOD_DIRECTOR mode, currentTier: TIER_1_COORDINATOR, assigned: coordId)

    // Now switch back to HOD_DIRECTOR
    const currentConfig = await getActiveWorkflowConfiguration();
    const switchBack = await updateWorkflowConfiguration(adminId, {
      mode: WorkflowMode.HOD_DIRECTOR,
      reason: "Switching back to HOD-Direct mode.",
      expectedVersion: currentConfig.version,
    });
    assert.strictEqual(switchBack.success, true);

    // Verify Grievance B (created in coordinator mode) DID NOT get modified or rerouted
    const grievanceB = await prisma.grievance.findFirst({
      where: {
        studentId,
        subject: "Tier 1 Coordinator grievance test",
      },
    });
    assert.ok(grievanceB);
    assert.strictEqual(grievanceB.currentTier, GrievanceTier.TIER_1_COORDINATOR);
    assert.strictEqual(grievanceB.assignedToUserId, coordId);
    assert.strictEqual(grievanceB.workflowMode, WorkflowMode.COORDINATOR_HOD_DIRECTOR);

    // Now lodge a NEW Grievance C under current HOD_DIRECTOR mode
    const resultC = await createStudentGrievance({
      studentId,
      courseId,
      semester: 3,
      category: GrievanceCategory.LABORATORY,
      subject: "New Grievance after switchback",
      description: "Should follow new HOD_DIRECTOR mode.",
    });
    assert.strictEqual(resultC.success, true);
    assert.strictEqual(resultC.grievance?.currentTier, GrievanceTier.TIER_2_HOD);
    assert.strictEqual(resultC.grievance?.assignedToUserId, hodId);
    assert.strictEqual(resultC.grievance?.workflowMode, WorkflowMode.HOD_DIRECTOR);
  });

  it("10. HOD escalation behavior: HoD can review directly submitted grievances", async () => {
    // Find grievance lodged directly to HoD
    const directGrievance = await prisma.grievance.findFirst({
      where: {
        studentId,
        currentTier: GrievanceTier.TIER_2_HOD,
        currentStatus: GrievanceStatus.SUBMITTED,
      },
    });
    assert.ok(directGrievance);

    // HoD marks under review
    const reviewResult = await hodMarkUnderReview(
      { actorUserId: hodId, grievanceId: directGrievance.id },
      "Department head beginning formal inquiry."
    );
    assert.strictEqual(reviewResult.success, true);
    assert.strictEqual(reviewResult.grievance?.currentStatus, GrievanceStatus.UNDER_REVIEW);

    // HoD resolves grievance directly
    const resolveResult = await hodResolveGrievance(
      { actorUserId: hodId, grievanceId: directGrievance.id },
      "Direct departmental resolution granted following review."
    );
    assert.strictEqual(resolveResult.success, true);
    assert.strictEqual(resolveResult.grievance?.currentStatus, GrievanceStatus.RESOLVED);
  });
});
