import "dotenv/config";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/lib/prisma";
import { UserRole } from "@prisma/client";
import {
  provisionStaffSchema,
  updateStaffProfileSchema,
  createAssignmentSchema,
  resetPasswordSubmitSchema,
} from "../src/lib/auth/validation";
import {
  createPasswordResetToken,
  validateResetToken,
  consumePasswordResetToken,
  hashResetToken,
} from "../src/lib/auth/password-reset";
import {
  resolveAuthorityChain,
  validateSchoolAuthorityMatrix,
} from "../src/lib/routing/authority-chain";
import {
  createSession,
  validateSessionToken,
  revokeAllUserSessions,
  generateSessionToken,
  hashSessionToken,
} from "../src/lib/auth/session";
import {
  AuthenticationError,
  ForbiddenError,
  AccountDeactivatedError,
} from "../src/lib/auth/guard";
import { AuthUser } from "../src/lib/auth/session";

describe("SAMVAD Phase 2: Authority Provisioning & Routing Configuration Tests", () => {
  // Test Identifiers
  const testStaffEmail = "dr.sharma.test@csjmu.ac.in";
  const testHodEmail = "dr.patel.hod.test@csjmu.ac.in";
  const testDirectorEmail = "director.sbs.test@csjmu.ac.in";

  const testDeptCode = "TEST_CHEM_PHASE2";
  const testDeptName = "Test Department of Applied Chemical Sciences";
  const testCourseCode = "MSCTEST";
  const testCourseName = "M.Sc. Industrial Chemical Testing";

  let adminUserId = "";
  let testDeptId = "";
  let testCourseId = "";
  let coordinatorUserId = "";
  let hodUserId = "";
  let directorUserId = "";

  function evaluateRoleGuard(user: AuthUser | null, allowedRoles: UserRole[]): AuthUser {
    if (!user) throw new AuthenticationError();
    if (!user.isActive) throw new AccountDeactivatedError();
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(
        `Access denied: required one of [${allowedRoles.join(", ")}], current role is '${user.role}'`
      );
    }
    return user;
  }

  async function cleanupTestData() {
    try {
      // Clean up assignments, reset tokens, courses, and users created for testing
      const testEmails = [testStaffEmail, testHodEmail, testDirectorEmail];
      const users = await prisma.user.findMany({
        where: { email: { in: testEmails } },
      });
      const userIds = users.map((u) => u.id);

      if (userIds.length > 0) {
        await prisma.passwordResetToken.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.session.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.staffAssignment.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.systemAuditLog.deleteMany({
          where: {
            OR: [
              { targetModel: "User", targetId: { in: userIds } },
              { adminUserId: { in: userIds } },
            ],
          },
        });
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }

      // Clean up test course and department
      const dept = await prisma.department.findUnique({
        where: { code: testDeptCode },
        include: { courses: true },
      });

      if (dept) {
        const cIds = dept.courses.map((c) => c.id);
        await prisma.staffAssignment.deleteMany({
          where: { departmentId: dept.id },
        });
        await prisma.systemAuditLog.deleteMany({
          where: {
            OR: [
              { targetModel: "Department", targetId: dept.id },
              { targetModel: "Course", targetId: { in: cIds } },
            ],
          },
        });
        await prisma.course.deleteMany({ where: { departmentId: dept.id } });
        await prisma.department.delete({ where: { id: dept.id } });
      }
    } catch (err) {
      console.error("Cleanup error in Phase 2 tests:", err);
    }
  }

  before(async () => {
    // 1. Get or create admin user for audit log FK
    const admin = await prisma.user.findFirst({
      where: { role: UserRole.SYSTEM_ADMIN },
    });
    if (admin) {
      adminUserId = admin.id;
    } else {
      const createdAdmin = await prisma.user.create({
        data: {
          email: "admin.phase2@csjmu.local",
          fullName: "System Admin Phase 2",
          role: UserRole.SYSTEM_ADMIN,
          passwordHash: "$2a$12$fakehashforintegrationtests00000000000000000000000000",
          phoneNumber: "9876500099",
          isActive: true,
        },
      });
      adminUserId = createdAdmin.id;
    }

    await cleanupTestData();

    // 2. Create test department and course
    const dept = await prisma.department.create({
      data: {
        name: testDeptName,
        code: testDeptCode,
        description: "Chemical Sciences Test Unit",
        isActive: true,
      },
    });
    testDeptId = dept.id;

    const course = await prisma.course.create({
      data: {
        departmentId: testDeptId,
        name: testCourseName,
        code: testCourseCode,
        programType: "Postgraduate",
        isActive: true,
      },
    });
    testCourseId = course.id;
  });

  after(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // ===========================================================================
  // 1. RBAC & Privilege Elevation Rejection
  // ===========================================================================
  describe("1. RBAC & Privilege Elevation Rejection", () => {
    const studentUser: AuthUser = {
      id: "student-1",
      email: "student@csjmu.ac.in",
      fullName: "Student One",
      role: UserRole.STUDENT,
      rollNumber: "240103001",
      enrollmentNo: "CSJM2024S1024",
      phoneNumber: "9876543210",
      isActive: true,
      mustResetPassword: false,
      createdAt: new Date(),
    };

    const coordUser: AuthUser = {
      id: "coord-1",
      email: "coord@csjmu.ac.in",
      fullName: "Coordinator One",
      role: UserRole.COURSE_COORDINATOR,
      rollNumber: null,
      enrollmentNo: null,
      phoneNumber: "9876543211",
      isActive: true,
      mustResetPassword: false,
      createdAt: new Date(),
    };

    it("should reject student attempting to access staff management (403 Forbidden)", () => {
      assert.throws(
        () => evaluateRoleGuard(studentUser, [UserRole.SYSTEM_ADMIN]),
        (err: any) => err instanceof ForbiddenError && err.statusCode === 403
      );
    });

    it("should reject Course Coordinator attempting to provision staff (403 Forbidden)", () => {
      assert.throws(
        () => evaluateRoleGuard(coordUser, [UserRole.SYSTEM_ADMIN]),
        (err: any) => err instanceof ForbiddenError && err.statusCode === 403
      );
    });

    it("should reject unauthenticated caller (401 Unauthorized)", () => {
      assert.throws(
        () => evaluateRoleGuard(null, [UserRole.SYSTEM_ADMIN]),
        (err: any) => err instanceof AuthenticationError && err.statusCode === 401
      );
    });

    it("should reject provisioning STUDENT via staff provision schema", () => {
      const res = provisionStaffSchema.safeParse({
        fullName: "Fake Student",
        email: "fake.student@csjmu.ac.in",
        role: UserRole.STUDENT,
      });
      assert.equal(res.success, false);
    });

    it("should reject provisioning SYSTEM_ADMIN via staff provision schema", () => {
      const res = provisionStaffSchema.safeParse({
        fullName: "Elevated Admin",
        email: "elevated.admin@csjmu.ac.in",
        role: UserRole.SYSTEM_ADMIN,
      });
      assert.equal(res.success, false);
    });

    it("should accept valid COURSE_COORDINATOR provisioning input", () => {
      const res = provisionStaffSchema.safeParse({
        fullName: "Dr. Arvind Sharma",
        email: "arvind.sharma@csjmu.ac.in",
        role: UserRole.COURSE_COORDINATOR,
        phoneNumber: "9876543210",
      });
      assert.equal(res.success, true);
    });

    it("should accept staff provisioning when phone number is empty string (optional field)", () => {
      const res = provisionStaffSchema.safeParse({
        fullName: "Prof. Anju Dixit",
        email: "anjudixit@csjmu.ac.in",
        role: UserRole.COURSE_COORDINATOR,
        phoneNumber: "",
      });
      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.data.phoneNumber, null);
      }
    });

    it("should accept staff provisioning when phone number is omitted or null", () => {
      const resOmitted = provisionStaffSchema.safeParse({
        fullName: "Prof. Anju Dixit",
        email: "anjudixit@csjmu.ac.in",
        role: UserRole.COURSE_COORDINATOR,
      });
      assert.equal(resOmitted.success, true);
      if (resOmitted.success) {
        assert.equal(resOmitted.data.phoneNumber, null);
      }

      const resNull = provisionStaffSchema.safeParse({
        fullName: "Prof. Anju Dixit",
        email: "anjudixit@csjmu.ac.in",
        role: UserRole.COURSE_COORDINATOR,
        phoneNumber: null,
      });
      assert.equal(resNull.success, true);
      if (resNull.success) {
        assert.equal(resNull.data.phoneNumber, null);
      }
    });

    it("should reject staff provisioning when phone number is malformed", () => {
      const res = provisionStaffSchema.safeParse({
        fullName: "Prof. Anju Dixit",
        email: "anjudixit@csjmu.ac.in",
        role: UserRole.COURSE_COORDINATOR,
        phoneNumber: "abc-invalid",
      });
      assert.equal(res.success, false);
    });
  });

  // ===========================================================================
  // 2. Staff Account Provisioning & Single-Use Password Setup
  // ===========================================================================
  describe("2. Staff Account Provisioning & Setup Token Lifecycle", () => {
    it("should provision a COURSE_COORDINATOR with mustResetPassword = true in database", async () => {
      const user = await prisma.user.create({
        data: {
          fullName: "Dr. Arvind Sharma",
          email: testStaffEmail,
          role: UserRole.COURSE_COORDINATOR,
          phoneNumber: "9876500111",
          passwordHash: "$2b$12$dummyhashforinitialcredentialprovisioning0000000000000",
          mustResetPassword: true,
          isActive: true,
        },
      });

      assert.ok(user.id);
      coordinatorUserId = user.id;
      assert.equal(user.email, testStaffEmail);
      assert.equal(user.role, UserRole.COURSE_COORDINATOR);
      assert.equal(user.mustResetPassword, true);
    });

    it("should reject duplicate staff email registration", async () => {
      await assert.rejects(
        async () => {
          await prisma.user.create({
            data: {
              fullName: "Duplicate Email Faculty",
              email: testStaffEmail,
              role: UserRole.COURSE_COORDINATOR,
              passwordHash: "$2b$12$dummyhash000000000000000000000000000000000000000000000",
            },
          });
        },
        (err: any) => {
          assert.equal(err.code, "P2002");
          return true;
        }
      );
    });

    let rawSetupToken = "";

    it("should generate a single-use, high-entropy password setup token", async () => {
      const { rawToken, expiresAt } = await createPasswordResetToken(coordinatorUserId);
      assert.ok(rawToken);
      assert.ok(rawToken.length >= 64);
      assert.ok(expiresAt.getTime() > Date.now());
      rawSetupToken = rawToken;

      // Verify token hash is stored in database, NOT raw token
      const tokenHash = hashResetToken(rawToken);
      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
      });
      assert.ok(tokenRecord);
      assert.equal(tokenRecord.userId, coordinatorUserId);
      assert.equal(tokenRecord.usedAt, null);
    });

    it("should successfully validate the setup token without consuming it", async () => {
      const check = await validateResetToken(rawSetupToken);
      assert.equal(check.valid, true);
      if (check.valid) {
        assert.equal(check.userEmail, testStaffEmail);
        assert.equal(check.role, UserRole.COURSE_COORDINATOR);
      }
    });

    it("should reject password consumption when password lacks complexity", async () => {
      const result = await consumePasswordResetToken(rawSetupToken, "simple");
      assert.equal(result.success, false);
      assert.ok(result.error);
    });

    it("should consume token, update passwordHash, set mustResetPassword=false, and burn token", async () => {
      const newPass = "Coordinator#2026Secure";
      const result = await consumePasswordResetToken(rawSetupToken, newPass);
      assert.equal(result.success, true);
      assert.equal(result.userId, coordinatorUserId);

      // Verify user mustResetPassword is now false
      const updatedUser = await prisma.user.findUnique({
        where: { id: coordinatorUserId },
      });
      assert.ok(updatedUser);
      assert.equal(updatedUser.mustResetPassword, false);

      // Verify token is burned
      const tokenHash = hashResetToken(rawSetupToken);
      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
      });
      assert.ok(tokenRecord);
      assert.ok(tokenRecord.usedAt !== null);
    });

    it("should reject reuse of an already-consumed setup token", async () => {
      const result = await consumePasswordResetToken(rawSetupToken, "AnotherPass#2026");
      assert.equal(result.success, false);
      assert.ok(result.error?.includes("already been used"));
    });
  });

  // ===========================================================================
  // 3. Session Revocation on Account Deactivation & Password Reset
  // ===========================================================================
  describe("3. Session Revocation on Account Deactivation & Reset", () => {
    let rawSessionToken = "";

    it("should authenticate and create an active database session", async () => {
      rawSessionToken = generateSessionToken();
      const hashedToken = hashSessionToken(rawSessionToken);
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

      await prisma.session.create({
        data: {
          userId: coordinatorUserId,
          token: hashedToken,
          expiresAt,
        },
      });

      const validation = await validateSessionToken(rawSessionToken);
      assert.ok(validation.user);
      assert.equal(validation.user.email, testStaffEmail);
    });

    it("should immediately revoke active sessions upon administrative deactivation", async () => {
      // 1. Deactivate account
      await prisma.user.update({
        where: { id: coordinatorUserId },
        data: { isActive: false },
      });

      // 2. Revoke sessions via service function
      const revokedCount = await revokeAllUserSessions(coordinatorUserId);
      assert.ok(revokedCount >= 1);

      // 3. Validate raw token returns DEACTIVATED / NOT_FOUND
      const check = await validateSessionToken(rawSessionToken);
      assert.equal(check.user, null);

      // Reactivate account for subsequent tests
      await prisma.user.update({
        where: { id: coordinatorUserId },
        data: { isActive: true },
      });
    });
  });

  // ===========================================================================
  // 4. Authority Assignment Management & Historical Archiving
  // ===========================================================================
  describe("4. Authority Assignment Management", () => {
    let coordinatorAssignmentId = "";
    let initialHodAssignmentId = "";

    it("should provision a Department Head (DEPARTMENT_HEAD) account", async () => {
      const hod = await prisma.user.create({
        data: {
          fullName: "Prof. Sunita Patel",
          email: testHodEmail,
          role: UserRole.DEPARTMENT_HEAD,
          phoneNumber: "9876500222",
          passwordHash: "$2b$12$dummyhash000000000000000000000000000000000000000000000",
          mustResetPassword: false,
          isActive: true,
        },
      });
      assert.ok(hod.id);
      hodUserId = hod.id;
    });

    it("should assign Course Coordinator to the test course", async () => {
      const assignment = await prisma.staffAssignment.create({
        data: {
          userId: coordinatorUserId,
          role: UserRole.COURSE_COORDINATOR,
          departmentId: testDeptId,
          courseId: testCourseId,
          isActive: true,
        },
      });

      assert.ok(assignment.id);
      coordinatorAssignmentId = assignment.id;
      assert.equal(assignment.role, UserRole.COURSE_COORDINATOR);
      assert.equal(assignment.courseId, testCourseId);
      assert.equal(assignment.isActive, true);
    });

    it("should assign Department Head to the test department (courseId = null)", async () => {
      const assignment = await prisma.staffAssignment.create({
        data: {
          userId: hodUserId,
          role: UserRole.DEPARTMENT_HEAD,
          departmentId: testDeptId,
          courseId: null,
          isActive: true,
        },
      });

      assert.ok(assignment.id);
      initialHodAssignmentId = assignment.id;
      assert.equal(assignment.courseId, null);
      assert.equal(assignment.isActive, true);
    });

    it("should enforce single active HOD cardinality and archive previous tenure", async () => {
      // Create a replacement HOD
      const newHod = await prisma.user.create({
        data: {
          fullName: "Prof. Vikram Malhotra",
          email: "dr.malhotra.hod.test@csjmu.ac.in",
          role: UserRole.DEPARTMENT_HEAD,
          passwordHash: "$2b$12$dummyhash000000000000000000000000000000000000000000000",
          isActive: true,
        },
      });

      // Atomic replacement transaction (as done by /api/admin/assignments)
      const replacementAssignment = await prisma.$transaction(async (tx) => {
        // Archive previous active HOD
        await tx.staffAssignment.updateMany({
          where: {
            departmentId: testDeptId,
            role: UserRole.DEPARTMENT_HEAD,
            courseId: null,
            isActive: true,
          },
          data: {
            isActive: false,
            unassignedAt: new Date(),
          },
        });

        // Create new active HOD
        return tx.staffAssignment.create({
          data: {
            userId: newHod.id,
            role: UserRole.DEPARTMENT_HEAD,
            departmentId: testDeptId,
            courseId: null,
            isActive: true,
          },
        });
      });

      assert.ok(replacementAssignment.id);

      // Verify old assignment is archived with unassignedAt timestamp
      const oldAssignment = await prisma.staffAssignment.findUnique({
        where: { id: initialHodAssignmentId },
      });
      assert.ok(oldAssignment);
      assert.equal(oldAssignment.isActive, false);
      assert.ok(oldAssignment.unassignedAt !== null);

      // Verify only 1 active HOD exists in this department
      const activeHods = await prisma.staffAssignment.findMany({
        where: {
          departmentId: testDeptId,
          role: UserRole.DEPARTMENT_HEAD,
          courseId: null,
          isActive: true,
        },
      });
      assert.equal(activeHods.length, 1);
      assert.equal(activeHods[0].userId, newHod.id);

      // Cleanup replacement HOD
      await prisma.staffAssignment.delete({ where: { id: replacementAssignment.id } });
      await prisma.user.delete({ where: { id: newHod.id } });

      // Restore initial HOD for authority resolution tests
      await prisma.staffAssignment.update({
        where: { id: initialHodAssignmentId },
        data: { isActive: true, unassignedAt: null },
      });
    });
  });

  // ===========================================================================
  // 5. Dynamic Authority Chain Resolution
  // ===========================================================================
  describe("5. Dynamic Authority Chain Resolution Service", () => {
    it("should resolve course authority details and coordinator/HOD mappings", async () => {
      const chain = await resolveAuthorityChain(testCourseId);
      assert.equal(chain.courseId, testCourseId);
      assert.ok(chain.coordinator !== null);
      assert.equal(chain.coordinator.userId, coordinatorUserId);
      assert.ok(chain.departmentHead !== null);
      assert.equal(chain.departmentHead.userId, hodUserId);
    });

    it("should resolve full 3-tier chain when exactly one Director is configured", async () => {
      // Check if an active director already exists from database seed
      const existingDirector = await prisma.user.findFirst({
        where: { role: UserRole.DIRECTOR, isActive: true },
      });

      if (!existingDirector) {
        const director = await prisma.user.create({
          data: {
            fullName: "Prof. K. N. Upadhyay",
            email: testDirectorEmail,
            role: UserRole.DIRECTOR,
            phoneNumber: "9876500333",
            passwordHash: "$2b$12$dummyhash000000000000000000000000000000000000000000000",
            isActive: true,
          },
        });
        directorUserId = director.id;
      } else {
        directorUserId = existingDirector.id;
      }

      const chain = await resolveAuthorityChain(testCourseId);

      assert.equal(chain.courseName, testCourseName);
      assert.equal(chain.departmentName, testDeptName);

      // Tier 1 Coordinator
      assert.ok(chain.coordinator);
      assert.equal(chain.coordinator.userId, coordinatorUserId);
      assert.equal(chain.coordinator.email, testStaffEmail);

      // Tier 2 Department Head
      assert.ok(chain.departmentHead);
      assert.equal(chain.departmentHead.userId, hodUserId);
      assert.equal(chain.departmentHead.email, testHodEmail);

      // Tier 3 Director
      assert.ok(chain.director);
      assert.equal(chain.director.role, UserRole.DIRECTOR);

      assert.equal(chain.isComplete, true);
      assert.equal(chain.status, "COMPLETE");
      assert.equal(chain.issues.length, 0);
    });

    it("should detect missing coordinator and mark chain as incomplete", async () => {
      // Temporarily deactivate coordinator assignment
      await prisma.staffAssignment.updateMany({
        where: { courseId: testCourseId },
        data: { isActive: false },
      });

      const chain = await resolveAuthorityChain(testCourseId);
      assert.equal(chain.isComplete, false);
      assert.equal(chain.coordinator, null);
      assert.ok(chain.issues.some((issue) => issue.includes("No active Course Coordinator")));

      // Restore coordinator assignment
      await prisma.staffAssignment.updateMany({
        where: { courseId: testCourseId },
        data: { isActive: true },
      });
    });

    it("should evaluate school-wide authority matrix report", async () => {
      const report = await validateSchoolAuthorityMatrix();
      assert.ok(report.totalCourses >= 1);
      assert.ok(Array.isArray(report.chains));
      const testChain = report.chains.find((c) => c.courseId === testCourseId);
      assert.ok(testChain);
      assert.equal(testChain.isComplete, true);
    });
  });
});
