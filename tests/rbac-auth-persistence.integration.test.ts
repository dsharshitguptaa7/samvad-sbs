import "dotenv/config";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";
import {
  createSession,
  validateSessionToken,
  revokeAllUserSessions,
  hashSessionToken,
  generateSessionToken,
  SESSION_COOKIE_NAME,
} from "../src/lib/auth/session";
import {
  getRoleDashboardPath,
  isSafeLocalRedirect,
  isRoleAuthorizedForPath,
  resolvePostLoginRedirect,
  ROLE_DASHBOARD_MAP,
} from "../src/lib/auth/role-routing";
import { middleware } from "../src/middleware";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { POST as loginHandler } from "../src/app/api/auth/login/route";

describe("SAMVAD RBAC, Authentication & Session Persistence Regression Suite", () => {
  const PREFIX = "test.rbac.";
  const testStudentEmail = `${PREFIX}student@csjmu.ac.in`;
  const testCoordEmail = `${PREFIX}coordinator@csjmu.ac.in`;
  const testHodEmail = `${PREFIX}hod@csjmu.ac.in`;
  const testDirectorEmail = `${PREFIX}director@csjmu.ac.in`;
  const testAdminEmail = `${PREFIX}admin@csjmu.ac.in`;
  const testPassword = "TestPassword#2026!";

  let studentUser: any;
  let coordinatorUser: any;
  let hodUser: any;
  let directorUser: any;
  let adminUser: any;

  let testDept: any;
  let otherDept: any;
  let testCourse: any;
  let otherCourse: any;

  async function cleanup() {
    try {
      const users = await prisma.user.findMany({
        where: { email: { startsWith: PREFIX } },
        select: { id: true },
      });
      const userIds = users.map((u) => u.id);

      if (userIds.length > 0) {
        await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.staffAssignment.deleteMany({ where: { userId: { in: userIds } } });

        // Cleanup any grievances associated with test users
        const grievances = await prisma.grievance.findMany({
          where: { studentId: { in: userIds } },
          select: { id: true },
        });
        const gIds = grievances.map((g) => g.id);
        if (gIds.length > 0) {
          await prisma.grievanceTimelineAction.deleteMany({ where: { grievanceId: { in: gIds } } });
          await prisma.documentRequest.deleteMany({ where: { grievanceId: { in: gIds } } });
          await prisma.grievanceDocument.deleteMany({ where: { grievanceId: { in: gIds } } });
          await prisma.grievance.deleteMany({ where: { id: { in: gIds } } });
        }

        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }

      // Cleanup test courses and departments
      await prisma.course.deleteMany({
        where: { code: { in: ["TEST_RBAC_C1", "TEST_RBAC_C2"] } },
      });
      await prisma.department.deleteMany({
        where: { code: { in: ["TEST_RBAC_D1", "TEST_RBAC_D2"] } },
      });
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  }

  before(async () => {
    await cleanup();

    const passwordHash = await hashPassword(testPassword);

    // Create Departments
    testDept = await prisma.department.create({
      data: {
        name: "Test Redressal Department 1",
        code: "TEST_RBAC_D1",
        description: "Department for RBAC testing",
        isActive: true,
      },
    });

    otherDept = await prisma.department.create({
      data: {
        name: "Test Redressal Department 2",
        code: "TEST_RBAC_D2",
        description: "Other department for cross-tenant testing",
        isActive: true,
      },
    });

    // Create Courses
    testCourse = await prisma.course.create({
      data: {
        name: "Test Physics M.Sc.",
        code: "TEST_RBAC_C1",
        departmentId: testDept.id,
        programType: "PG",
        isActive: true,
      },
    });

    otherCourse = await prisma.course.create({
      data: {
        name: "Test Chemistry M.Sc.",
        code: "TEST_RBAC_C2",
        departmentId: otherDept.id,
        programType: "PG",
        isActive: true,
      },
    });

    // Create Users for each role
    studentUser = await prisma.user.create({
      data: {
        email: testStudentEmail,
        fullName: "Test Student RBAC",
        passwordHash,
        role: UserRole.STUDENT,
        rollNumber: "RBAC2026001",
        enrollmentNo: "ENR_RBAC2026001",
        isActive: true,
      },
    });

    coordinatorUser = await prisma.user.create({
      data: {
        email: testCoordEmail,
        fullName: "Test Coordinator RBAC",
        passwordHash,
        role: UserRole.COURSE_COORDINATOR,
        phoneNumber: "9811001100",
        isActive: true,
      },
    });

    hodUser = await prisma.user.create({
      data: {
        email: testHodEmail,
        fullName: "Test HoD RBAC",
        passwordHash,
        role: UserRole.DEPARTMENT_HEAD,
        phoneNumber: "9811002200",
        isActive: true,
      },
    });

    directorUser = await prisma.user.create({
      data: {
        email: testDirectorEmail,
        fullName: "Test Director RBAC",
        passwordHash,
        role: UserRole.DIRECTOR,
        phoneNumber: "9811003300",
        isActive: true,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: testAdminEmail,
        fullName: "Test Admin RBAC",
        passwordHash,
        role: UserRole.SYSTEM_ADMIN,
        phoneNumber: "9811004400",
        isActive: true,
      },
    });

    // Assign Coordinator to testCourse only (not otherCourse)
    await prisma.staffAssignment.create({
      data: {
        userId: coordinatorUser.id,
        role: UserRole.COURSE_COORDINATOR,
        departmentId: testDept.id,
        courseId: testCourse.id,
        isActive: true,
      },
    });

    // Assign HoD to testDept only (not otherDept)
    await prisma.staffAssignment.create({
      data: {
        userId: hodUser.id,
        role: UserRole.DEPARTMENT_HEAD,
        departmentId: testDept.id,
        isActive: true,
      },
    });
  });

  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  // ===========================================================================
  // 1. Successful Login & Session Persistence Across Requests
  // ===========================================================================
  describe("1. Session Persistence & Authentication Lifecycle", () => {
    it("should authenticate student and persist session across multiple requests", async () => {
      // 1. Create a session for student
      const rawToken = generateSessionToken();
      const hashed = hashSessionToken(rawToken);
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

      await prisma.session.create({
        data: {
          userId: studentUser.id,
          token: hashed,
          expiresAt,
        },
      });

      // 2. Validate token (Request 1)
      const res1 = await validateSessionToken(rawToken);
      assert.ok(res1.user, "User must be resolved in request 1");
      assert.equal(res1.user.id, studentUser.id);
      assert.equal(res1.user.role, UserRole.STUDENT);

      // 3. Validate token again (Request 2)
      const res2 = await validateSessionToken(rawToken);
      assert.ok(res2.user, "User must persist for subsequent request 2");
      assert.equal(res2.user.id, studentUser.id);
    });

    it("should reject invalid credentials", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: testStudentEmail,
          password: "WrongPassword#999",
          portalType: "student",
        }),
      });

      const res = await loginHandler(req);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.error.includes("Invalid credentials"));
    });

    it("should reject portal mismatch: student attempting staff login", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: testStudentEmail,
          password: testPassword,
          portalType: "staff",
        }),
      });

      const res = await loginHandler(req);
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, "PORTAL_MISMATCH");
    });
  });

  // ===========================================================================
  // 2. Role-Based Destination Mapping & Post-Login Redirection
  // ===========================================================================
  describe("2. Server-Authoritative Role Destination Mapping", () => {
    it("should correctly map all 5 canonical user roles to their workspaces", () => {
      assert.equal(getRoleDashboardPath(UserRole.SYSTEM_ADMIN), "/admin");
      assert.equal(getRoleDashboardPath(UserRole.STUDENT), "/student");
      assert.equal(getRoleDashboardPath(UserRole.COURSE_COORDINATOR), "/coordinator");
      assert.equal(getRoleDashboardPath(UserRole.DEPARTMENT_HEAD), "/department-head");
      assert.equal(getRoleDashboardPath(UserRole.DIRECTOR), "/director");
      assert.equal(getRoleDashboardPath(null), "/");
      assert.equal(getRoleDashboardPath("UNKNOWN" as any), "/");
    });

    it("should return the canonical role dashboard upon login in API response", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: testCoordEmail,
          password: testPassword,
          portalType: "staff",
        }),
      });

      const res = await loginHandler(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.redirectUrl, "/coordinator");
    });
  });

  // ===========================================================================
  // 3. Authenticated Users Visiting /login
  // ===========================================================================
  describe("3. Redirection of Authenticated Users on /login", () => {
    it("should redirect authenticated user to role dashboard instead of showing login", () => {
      // If user is STUDENT, resolvePostLoginRedirect returns /student
      assert.equal(resolvePostLoginRedirect(UserRole.STUDENT, undefined), "/student");
      assert.equal(resolvePostLoginRedirect(UserRole.SYSTEM_ADMIN, undefined), "/admin");
      assert.equal(resolvePostLoginRedirect(UserRole.COURSE_COORDINATOR, undefined), "/coordinator");
      assert.equal(resolvePostLoginRedirect(UserRole.DEPARTMENT_HEAD, undefined), "/department-head");
      assert.equal(resolvePostLoginRedirect(UserRole.DIRECTOR, undefined), "/director");
    });

    it("should safely redirect authenticated user if requestedRedirect is authorized", () => {
      // Student requesting /student -> allowed
      assert.equal(resolvePostLoginRedirect(UserRole.STUDENT, "/student"), "/student");
      // Admin requesting /admin -> allowed
      assert.equal(resolvePostLoginRedirect(UserRole.SYSTEM_ADMIN, "/admin"), "/admin");
    });

    it("should override unauthorized redirect target with user's role dashboard", () => {
      // Student trying to redirect to /admin -> falls back to /student!
      assert.equal(resolvePostLoginRedirect(UserRole.STUDENT, "/admin"), "/student");
      // Coordinator trying to redirect to /director -> falls back to /coordinator!
      assert.equal(resolvePostLoginRedirect(UserRole.COURSE_COORDINATOR, "/director"), "/coordinator");
      // HoD trying to redirect to /student -> falls back to /department-head!
      assert.equal(resolvePostLoginRedirect(UserRole.DEPARTMENT_HEAD, "/student"), "/department-head");
    });

    it("should prevent circular redirects when requested redirect is /login", () => {
      assert.equal(resolvePostLoginRedirect(UserRole.STUDENT, "/login"), "/student");
      assert.equal(resolvePostLoginRedirect(UserRole.STUDENT, "/login?error=role_mismatch"), "/student");
    });
  });

  // ===========================================================================
  // 4. Missing, Expired, Revoked, and Malformed Sessions
  // ===========================================================================
  describe("4. Session Invalidation, Expiry, and Revocation", () => {
    it("should reject missing or empty session tokens", async () => {
      const res = await validateSessionToken("");
      assert.equal(res.user, null);
      assert.equal(res.reason, "UNAUTHENTICATED");
    });

    it("should reject non-existent session tokens", async () => {
      const randomToken = generateSessionToken();
      const res = await validateSessionToken(randomToken);
      assert.equal(res.user, null);
      assert.equal(res.reason, "NOT_FOUND");
    });

    it("should reject expired session tokens and purge them", async () => {
      const rawToken = generateSessionToken();
      const hashed = hashSessionToken(rawToken);
      // Expired 1 hour ago
      const expiredAt = new Date(Date.now() - 3600 * 1000);

      await prisma.session.create({
        data: {
          userId: studentUser.id,
          token: hashed,
          expiresAt: expiredAt,
        },
      });

      const res = await validateSessionToken(rawToken);
      assert.equal(res.user, null);
      assert.equal(res.reason, "EXPIRED");

      // Verify purged from DB
      const dbSession = await prisma.session.findUnique({ where: { token: hashed } });
      assert.equal(dbSession, null);
    });

    it("should revoke all sessions on user-wide session invalidation", async () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();

      await prisma.session.createMany({
        data: [
          {
            userId: studentUser.id,
            token: hashSessionToken(token1),
            expiresAt: new Date(Date.now() + 3600 * 1000),
          },
          {
            userId: studentUser.id,
            token: hashSessionToken(token2),
            expiresAt: new Date(Date.now() + 3600 * 1000),
          },
        ],
      });

      const count = await revokeAllUserSessions(studentUser.id);
      assert.ok(count >= 2);

      const check1 = await validateSessionToken(token1);
      const check2 = await validateSessionToken(token2);
      assert.equal(check1.user, null);
      assert.equal(check2.user, null);
    });
  });

  // ===========================================================================
  // 5. Deactivated User Immediate Access Revocation
  // ===========================================================================
  describe("5. Account Deactivation Enforcement", () => {
    it("should immediately deny access and invalidate session if user is deactivated", async () => {
      // 1. Create active session
      const token = generateSessionToken();
      await prisma.session.create({
        data: {
          userId: coordinatorUser.id,
          token: hashSessionToken(token),
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      });

      // 2. Verify valid initially
      const preCheck = await validateSessionToken(token);
      assert.ok(preCheck.user);

      // 3. Deactivate user in DB
      await prisma.user.update({
        where: { id: coordinatorUser.id },
        data: { isActive: false },
      });

      // 4. Validate session now -> should be rejected as DEACTIVATED
      const postCheck = await validateSessionToken(token);
      assert.equal(postCheck.user, null);
      assert.equal(postCheck.reason, "DEACTIVATED");

      // 5. Restore active status
      await prisma.user.update({
        where: { id: coordinatorUser.id },
        data: { isActive: true },
      });
    });

    it("should reject login attempt for deactivated user", async () => {
      await prisma.user.update({
        where: { id: studentUser.id },
        data: { isActive: false },
      });

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: testStudentEmail,
          password: testPassword,
          portalType: "student",
        }),
      });

      const res = await loginHandler(req);
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, "ACCOUNT_DEACTIVATED");

      // Restore active status
      await prisma.user.update({
        where: { id: studentUser.id },
        data: { isActive: true },
      });
    });
  });

  // ===========================================================================
  // 6. Role Boundaries & Cross-Role Authorization Checks
  // ===========================================================================
  describe("6. Role Boundary Isolation", () => {
    it("should enforce route authorization policy strictly", () => {
      // Students
      assert.equal(isRoleAuthorizedForPath(UserRole.STUDENT, "/student"), true);
      assert.equal(isRoleAuthorizedForPath(UserRole.STUDENT, "/api/student/grievances"), true);
      assert.equal(isRoleAuthorizedForPath(UserRole.STUDENT, "/admin"), false);
      assert.equal(isRoleAuthorizedForPath(UserRole.STUDENT, "/api/admin/staff"), false);
      assert.equal(isRoleAuthorizedForPath(UserRole.STUDENT, "/coordinator"), false);
      assert.equal(isRoleAuthorizedForPath(UserRole.STUDENT, "/department-head"), false);
      assert.equal(isRoleAuthorizedForPath(UserRole.STUDENT, "/director"), false);

      // Coordinators
      assert.equal(isRoleAuthorizedForPath(UserRole.COURSE_COORDINATOR, "/coordinator"), true);
      assert.equal(isRoleAuthorizedForPath(UserRole.COURSE_COORDINATOR, "/api/coordinator/grievances"), true);
      assert.equal(isRoleAuthorizedForPath(UserRole.COURSE_COORDINATOR, "/admin"), false);
      assert.equal(isRoleAuthorizedForPath(UserRole.COURSE_COORDINATOR, "/student"), false);
      assert.equal(isRoleAuthorizedForPath(UserRole.COURSE_COORDINATOR, "/department-head"), false);

      // Department Heads
      assert.equal(isRoleAuthorizedForPath(UserRole.DEPARTMENT_HEAD, "/department-head"), true);
      assert.equal(isRoleAuthorizedForPath(UserRole.DEPARTMENT_HEAD, "/api/department-head/grievances"), true);
      assert.equal(isRoleAuthorizedForPath(UserRole.DEPARTMENT_HEAD, "/admin"), false);
      assert.equal(isRoleAuthorizedForPath(UserRole.DEPARTMENT_HEAD, "/director"), false);

      // Director
      assert.equal(isRoleAuthorizedForPath(UserRole.DIRECTOR, "/director"), true);
      assert.equal(isRoleAuthorizedForPath(UserRole.DIRECTOR, "/api/director/grievances"), true);
      assert.equal(isRoleAuthorizedForPath(UserRole.DIRECTOR, "/admin"), false);

      // Admin
      assert.equal(isRoleAuthorizedForPath(UserRole.SYSTEM_ADMIN, "/admin"), true);
      assert.equal(isRoleAuthorizedForPath(UserRole.SYSTEM_ADMIN, "/api/admin/staff"), true);
      assert.equal(isRoleAuthorizedForPath(UserRole.SYSTEM_ADMIN, "/student"), false);
      // Admin is excluded from evidence documents (separation of powers)
      assert.equal(isRoleAuthorizedForPath(UserRole.SYSTEM_ADMIN, "/api/documents/some-id"), false);
    });

    it("should allow all roles to visit public routes", () => {
      const publicPaths = ["/", "/track", "/register", "/reset-password"];
      for (const p of publicPaths) {
        assert.equal(isRoleAuthorizedForPath(UserRole.STUDENT, p), true);
        assert.equal(isRoleAuthorizedForPath(UserRole.COURSE_COORDINATOR, p), true);
        assert.equal(isRoleAuthorizedForPath(UserRole.DEPARTMENT_HEAD, p), true);
        assert.equal(isRoleAuthorizedForPath(UserRole.DIRECTOR, p), true);
        assert.equal(isRoleAuthorizedForPath(UserRole.SYSTEM_ADMIN, p), true);
      }
    });
  });

  // ===========================================================================
  // 7. Open Redirect & URL Manipulation Defenses
  // ===========================================================================
  describe("7. Safe Redirection & Open Redirect Prevention", () => {
    it("should detect and reject unsafe, absolute, and external redirect URLs", () => {
      assert.equal(isSafeLocalRedirect("https://evil.com"), false);
      assert.equal(isSafeLocalRedirect("http://evil.com"), false);
      assert.equal(isSafeLocalRedirect("//evil.com"), false);
      assert.equal(isSafeLocalRedirect("/\\evil.com"), false);
      assert.equal(isSafeLocalRedirect("\\evil.com"), false);
      assert.equal(isSafeLocalRedirect("/javascript:alert(1)"), false);
      assert.equal(isSafeLocalRedirect("javascript:alert(1)"), false);
      assert.equal(isSafeLocalRedirect("/data:text/html,evil"), false);
      assert.equal(isSafeLocalRedirect("/login\r\nSet-Cookie:malicious=1"), false);
      assert.equal(isSafeLocalRedirect("/login"), false);
      assert.equal(isSafeLocalRedirect(""), false);
      assert.equal(isSafeLocalRedirect(null), false);
    });

    it("should accept safe local URLs", () => {
      assert.equal(isSafeLocalRedirect("/student"), true);
      assert.equal(isSafeLocalRedirect("/coordinator?page=1"), true);
      assert.equal(isSafeLocalRedirect("/department-head/grievances"), true);
      assert.equal(isSafeLocalRedirect("/track"), true);
    });
  });

  // ===========================================================================
  // 8. Middleware Route & Header Behavior
  // ===========================================================================
  describe("8. Middleware Access Guard & Cache Headers", () => {
    it("should return 401 JSON when unauthenticated request calls protected API", () => {
      const req = new NextRequest("http://localhost:3000/api/admin/staff");
      const res = middleware(req);
      assert.equal(res.status, 401);
      assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate, proxy-revalidate");
    });

    it("should redirect to /login with redirect param when unauthenticated request visits protected page", () => {
      const req = new NextRequest("http://localhost:3000/coordinator");
      const res = middleware(req);
      assert.equal(res.status, 307);
      const location = res.headers.get("location");
      assert.ok(location);
      assert.ok(location.includes("/login?redirect=%2Fcoordinator"));
      assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate, proxy-revalidate");
    });

    it("should attach no-store cache headers for authenticated protected access to thwart bfcache leakage", () => {
      const req = new NextRequest("http://localhost:3000/student", {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=dummy_token_value`,
        },
      });
      const res = middleware(req);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate, proxy-revalidate");
      assert.equal(res.headers.get("pragma"), "no-cache");
    });
  });
});
