import "dotenv/config";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/lib/prisma";
import { UserRole } from "@prisma/client";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  createCourseSchema,
  updateCourseSchema,
} from "../src/lib/auth/validation";
import {
  AuthenticationError,
  ForbiddenError,
  AccountDeactivatedError,
} from "../src/lib/auth/guard";
import { AuthUser } from "../src/lib/auth/session";

describe("SAMVAD Phase 1: Academic Master Data Management Tests", () => {
  const testDeptCode = "TEST_APPL_MATH";
  const testDeptName = "Test Department of Applied Analysis & Computing";
  let adminUserId = "";
  let createdDepartmentId = "";
  let createdCourseId = "";

  const mockAdminUser: AuthUser = {
    id: "admin-master-data-test-id",
    role: UserRole.SYSTEM_ADMIN,
    email: "admin.test@csjmu.ac.in",
    fullName: "System Admin Test",
    rollNumber: null,
    enrollmentNo: null,
    phoneNumber: "9876500001",
    isActive: true,
    mustResetPassword: false,
    createdAt: new Date(),
  };

  const mockStudentUser: AuthUser = {
    id: "student-master-data-test-id",
    role: UserRole.STUDENT,
    email: "student.test@csjmu.ac.in",
    fullName: "Student Test",
    rollNumber: "240103001",
    enrollmentNo: "CSJM2024S1024",
    phoneNumber: "9876543210",
    isActive: true,
    mustResetPassword: false,
    createdAt: new Date(),
  };

  const mockCoordinatorUser: AuthUser = {
    id: "coord-master-data-test-id",
    role: UserRole.COURSE_COORDINATOR,
    email: "coord.test@csjmu.ac.in",
    fullName: "Coordinator Test",
    rollNumber: null,
    enrollmentNo: null,
    phoneNumber: "9876500002",
    isActive: true,
    mustResetPassword: false,
    createdAt: new Date(),
  };

  const mockDeactivatedUser: AuthUser = {
    id: "deactivated-admin-test-id",
    role: UserRole.SYSTEM_ADMIN,
    email: "deactivated.admin@csjmu.ac.in",
    fullName: "Deactivated Admin",
    rollNumber: null,
    enrollmentNo: null,
    phoneNumber: "9876500099",
    isActive: false,
    mustResetPassword: false,
    createdAt: new Date(),
  };

  // Helper matching SAMVAD guard evaluate pattern
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
      const depts = await prisma.department.findMany({
        where: {
          OR: [
            { code: testDeptCode },
            { name: testDeptName },
            { code: "DIFFCODE_99" },
          ],
        },
        include: { courses: true },
      });

      for (const dept of depts) {
        const courseIds = dept.courses.map((c) => c.id);
        await prisma.systemAuditLog.deleteMany({
          where: {
            OR: [
              { targetModel: "Department", targetId: dept.id },
              { targetModel: "Course", targetId: { in: courseIds } },
            ],
          },
        });
        await prisma.course.deleteMany({ where: { departmentId: dept.id } });
        await prisma.department.delete({ where: { id: dept.id } });
      }
    } catch (err) {
      console.error("Cleanup error in master data tests:", err);
    }
  }

  before(async () => {
    // Locate or create test admin user for audit log adminUserId foreign key
    const admin = await prisma.user.findFirst({
      where: { role: UserRole.SYSTEM_ADMIN },
    });
    if (admin) {
      adminUserId = admin.id;
    } else {
      const createdAdmin = await prisma.user.create({
        data: {
          email: "admin.integration@csjmu.local",
          fullName: "System Admin Integration",
          role: UserRole.SYSTEM_ADMIN,
          passwordHash: "$2a$12$fakehashforintegrationtests00000000000000000000000000",
          phoneNumber: "9876500099",
          isActive: true,
        },
      });
      adminUserId = createdAdmin.id;
    }

    await cleanupTestData();
  });

  after(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // ===========================================================================
  // 1. RBAC & Access Control Boundary Enforcement
  // ===========================================================================
  describe("1. RBAC Server-Side Authorization for Master Data", () => {
    it("should allow active SYSTEM_ADMIN to access admin master data operations", () => {
      const user = evaluateRoleGuard(mockAdminUser, [UserRole.SYSTEM_ADMIN]);
      assert.equal(user.role, UserRole.SYSTEM_ADMIN);
      assert.equal(user.email, "admin.test@csjmu.ac.in");
    });

    it("should reject unauthenticated access (null user) with AuthenticationError", () => {
      assert.throws(
        () => evaluateRoleGuard(null, [UserRole.SYSTEM_ADMIN]),
        (err: any) => err instanceof AuthenticationError && err.statusCode === 401
      );
    });

    it("should reject STUDENT attempting master data operations with ForbiddenError", () => {
      assert.throws(
        () => evaluateRoleGuard(mockStudentUser, [UserRole.SYSTEM_ADMIN]),
        (err: any) => err instanceof ForbiddenError && err.statusCode === 403
      );
    });

    it("should reject COURSE_COORDINATOR attempting master data mutations with ForbiddenError", () => {
      assert.throws(
        () => evaluateRoleGuard(mockCoordinatorUser, [UserRole.SYSTEM_ADMIN]),
        (err: any) => err instanceof ForbiddenError && err.statusCode === 403
      );
    });

    it("should reject deactivated SYSTEM_ADMIN with AccountDeactivatedError", () => {
      assert.throws(
        () => evaluateRoleGuard(mockDeactivatedUser, [UserRole.SYSTEM_ADMIN]),
        (err: any) => err instanceof AccountDeactivatedError && err.statusCode === 403
      );
    });
  });

  // ===========================================================================
  // 2. Input Validation (Zod Schemas)
  // ===========================================================================
  describe("2. Master Data Input Validation", () => {
    it("should validate valid department creation data", () => {
      const valid = createDepartmentSchema.safeParse({
        name: "Department of Materials Science",
        code: "MATSCI",
        description: "Nanotechnology and polymer chemistry.",
        isActive: true,
      });
      assert.equal(valid.success, true);
    });

    it("should auto-transform department code to uppercase", () => {
      const parsed = createDepartmentSchema.safeParse({
        name: "Department of Data Science",
        code: "datasci",
      });
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.code, "DATASCI");
      }
    });

    it("should reject department creation with missing name or code", () => {
      const invalid = createDepartmentSchema.safeParse({
        description: "Missing essential identifiers",
      });
      assert.equal(invalid.success, false);
    });

    it("should validate valid course creation data with valid UUID departmentId", () => {
      const valid = createCourseSchema.safeParse({
        departmentId: "a0000000-0000-4000-8000-000000000001",
        name: "M.Sc. Materials Science",
        code: "MSCMS",
        programType: "Postgraduate",
        isActive: true,
      });
      assert.equal(valid.success, true);
      if (valid.success) {
        assert.equal(valid.data.code, "MSCMS");
      }
    });

    it("should reject course creation with invalid UUID departmentId", () => {
      const invalid = createCourseSchema.safeParse({
        departmentId: "not-a-valid-uuid",
        name: "M.Sc. Invalid Dept",
        code: "MSCINVAL",
      });
      assert.equal(invalid.success, false);
    });

    it("should reject course creation with empty course name or code", () => {
      const invalid = createCourseSchema.safeParse({
        departmentId: "a0000000-0000-0000-0000-000000000001",
        name: "",
        code: "",
      });
      assert.equal(invalid.success, false);
    });
  });

  // ===========================================================================
  // 3. Database Persistence: Department Lifecycle & Audit Logging
  // ===========================================================================
  describe("3. Database Persistence: Department Lifecycle", () => {
    it("should create a new department with transactional audit log in Neon DB", async () => {
      const result = await prisma.$transaction(async (tx) => {
        const dept = await tx.department.create({
          data: {
            name: testDeptName,
            code: testDeptCode,
            description: "Advanced mathematical physics research unit.",
            isActive: true,
          },
        });

        await tx.systemAuditLog.create({
          data: {
            adminUserId: adminUserId,
            action: "DEPARTMENT_CREATED",
            targetModel: "Department",
            targetId: dept.id,
            details: { name: dept.name, code: dept.code },
          },
        });

        return dept;
      });

      assert.ok(result.id);
      createdDepartmentId = result.id;
      assert.equal(result.code, testDeptCode);
      assert.equal(result.isActive, true);

      // Verify audit log exists
      const auditLog = await prisma.systemAuditLog.findFirst({
        where: {
          targetModel: "Department",
          targetId: createdDepartmentId,
          action: "DEPARTMENT_CREATED",
        },
      });
      assert.ok(auditLog);
      assert.equal(auditLog.adminUserId, adminUserId);
    });

    it("should reject creating a department with duplicate code (P2002 constraint)", async () => {
      await assert.rejects(
        async () => {
          await prisma.department.create({
            data: {
              name: "Different Name But Same Code",
              code: testDeptCode,
              isActive: true,
            },
          });
        },
        (err: any) => {
          assert.equal(err.code, "P2002");
          return true;
        }
      );
    });

    it("should reject creating a department with duplicate name (P2002 constraint)", async () => {
      await assert.rejects(
        async () => {
          await prisma.department.create({
            data: {
              name: testDeptName,
              code: "DIFFCODE_99",
              isActive: true,
            },
          });
        },
        (err: any) => {
          assert.equal(err.code, "P2002");
          return true;
        }
      );
    });

    it("should update department details and preserve historical ledger", async () => {
      assert.ok(createdDepartmentId, "createdDepartmentId must be set");
      const updated = await prisma.department.update({
        where: { id: createdDepartmentId },
        data: {
          description: "Updated description for Applied Analysis department.",
        },
      });

      assert.equal(updated.description, "Updated description for Applied Analysis department.");
      assert.equal(updated.code, testDeptCode);
    });

    it("should deactivate department without deleting historical data", async () => {
      assert.ok(createdDepartmentId, "createdDepartmentId must be set");
      const deactivated = await prisma.department.update({
        where: { id: createdDepartmentId },
        data: { isActive: false },
      });

      assert.equal(deactivated.isActive, false);

      const found = await prisma.department.findUnique({
        where: { id: createdDepartmentId },
      });
      assert.ok(found);
      assert.equal(found.isActive, false);
    });

    it("should reactivate department cleanly", async () => {
      assert.ok(createdDepartmentId, "createdDepartmentId must be set");
      const reactivated = await prisma.department.update({
        where: { id: createdDepartmentId },
        data: { isActive: true },
      });

      assert.equal(reactivated.isActive, true);
    });
  });

  // ===========================================================================
  // 4. Database Persistence: Course Lifecycle & Department Foreign Keys
  // ===========================================================================
  describe("4. Database Persistence: Course Lifecycle", () => {
    it("should create a course linked to the department with audit logging", async () => {
      assert.ok(createdDepartmentId, "createdDepartmentId must be set");
      const course = await prisma.$transaction(async (tx) => {
        const c = await tx.course.create({
          data: {
            departmentId: createdDepartmentId,
            name: "M.Sc. Applied Analysis",
            code: "MSCAA",
            programType: "Postgraduate",
            isActive: true,
          },
        });

        await tx.systemAuditLog.create({
          data: {
            adminUserId: adminUserId,
            action: "COURSE_CREATED",
            targetModel: "Course",
            targetId: c.id,
            details: { name: c.name, code: c.code, departmentId: createdDepartmentId },
          },
        });

        return c;
      });

      assert.ok(course.id);
      createdCourseId = course.id;
      assert.equal(course.departmentId, createdDepartmentId);
      assert.equal(course.code, "MSCAA");
      assert.equal(course.isActive, true);

      // Verify audit log
      const audit = await prisma.systemAuditLog.findFirst({
        where: {
          targetModel: "Course",
          targetId: createdCourseId,
          action: "COURSE_CREATED",
        },
      });
      assert.ok(audit);
    });

    it("should reject creating a course with duplicate code within the same department", async () => {
      assert.ok(createdDepartmentId, "createdDepartmentId must be set");
      await assert.rejects(
        async () => {
          await prisma.course.create({
            data: {
              departmentId: createdDepartmentId,
              name: "Duplicate Code Course",
              code: "MSCAA",
              isActive: true,
            },
          });
        },
        (err: any) => {
          assert.equal(err.code, "P2002");
          return true;
        }
      );
    });

    it("should reject creating a course with nonexistent departmentId (P2003 foreign key)", async () => {
      await assert.rejects(
        async () => {
          await prisma.course.create({
            data: {
              departmentId: "00000000-0000-0000-0000-000000000000",
              name: "Ghost Department Course",
              code: "GHOST101",
              isActive: true,
            },
          });
        },
        (err: any) => {
          assert.equal(err.code, "P2003");
          return true;
        }
      );
    });

    it("should allow editing course attributes", async () => {
      assert.ok(createdCourseId, "createdCourseId must be set");
      const updated = await prisma.course.update({
        where: { id: createdCourseId },
        data: {
          name: "M.Sc. Applied Mathematical Analysis",
          programType: "Postgraduate (Specialized)",
        },
      });

      assert.equal(updated.name, "M.Sc. Applied Mathematical Analysis");
      assert.equal(updated.programType, "Postgraduate (Specialized)");
    });

    it("should toggle course active status to false and verify preservation", async () => {
      assert.ok(createdCourseId, "createdCourseId must be set");
      const deactivated = await prisma.course.update({
        where: { id: createdCourseId },
        data: { isActive: false },
      });

      assert.equal(deactivated.isActive, false);

      const retrieved = await prisma.course.findUnique({
        where: { id: createdCourseId },
      });
      assert.ok(retrieved);
      assert.equal(retrieved.isActive, false);
    });
  });

  // ===========================================================================
  // 5. Public Endpoint Data Stripping & Filtering
  // ===========================================================================
  describe("5. Public Endpoint Data Integrity & Security", () => {
    it("should fetch active departments and exclude inactive courses from public payload", async () => {
      // createdCourseId was deactivated above (isActive: false)
      const publicDepts = await prisma.department.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          courses: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              code: true,
              programType: true,
            },
            orderBy: { name: "asc" },
          },
        },
      });

      assert.ok(Array.isArray(publicDepts));
      const testDept = publicDepts.find((d) => d.code === testDeptCode);
      assert.ok(testDept);
      // Inactive course MSCAA must not be present in public active list
      const inactiveCourseInTestDept = testDept.courses.find((c) => c.code === "MSCAA");
      assert.equal(inactiveCourseInTestDept, undefined);
    });
  });
});
