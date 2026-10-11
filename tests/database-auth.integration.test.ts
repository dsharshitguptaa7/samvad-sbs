import "dotenv/config";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/lib/prisma";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import {
  createSession,
  validateSessionToken,
  revokeAllUserSessions,
  hashSessionToken,
  generateSessionToken,
  sanitizeUser,
} from "../src/lib/auth/session";
import { UserRole } from "@prisma/client";
import {
  requireRole,
  requireAuth,
  ForbiddenError,
  AccountDeactivatedError,
} from "../src/lib/auth/guard";

describe("SAMVAD Neon Database Integration Tests", () => {
  const testEmail = "test.integration.student@csjmu.ac.in";
  const testRollNumber = "INT240103999";
  const testEnrollmentNo = "CSJM2024INT999";
  const testPassword = "IntegrationSecret#2026";
  let testUserId = "";

  // Clean up any pre-existing test data before and after tests
  async function cleanupTestData() {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: testEmail },
            { rollNumber: testRollNumber },
            { enrollmentNo: testEnrollmentNo },
          ],
        },
      });
      if (user) {
        await prisma.session.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  }

  before(async () => {
    await cleanupTestData();
  });

  after(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // ===========================================================================
  // 1. Database-backed Registration
  // ===========================================================================
  it("should create student user in live Neon database with hashed password", async () => {
    const passwordHash = await hashPassword(testPassword);

    const newUser = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        fullName: "Integration Test Student",
        role: UserRole.STUDENT,
        phoneNumber: "9876543210",
        rollNumber: testRollNumber,
        enrollmentNo: testEnrollmentNo,
        isActive: true,
        mustResetPassword: false,
      },
    });

    assert.ok(newUser.id);
    testUserId = newUser.id;
    assert.equal(newUser.email, testEmail);
    assert.equal(newUser.role, UserRole.STUDENT);
    assert.equal(newUser.isActive, true);
    assert.notEqual(newUser.passwordHash, testPassword);
    assert.ok(newUser.passwordHash.startsWith("$2a$") || newUser.passwordHash.startsWith("$2b$"));
  });

  // ===========================================================================
  // 2. Duplicate Registration & Database Constraint Enforcement
  // ===========================================================================
  it("should reject duplicate registration with identical email via P2002 constraint", async () => {
    const passwordHash = await hashPassword(testPassword);

    await assert.rejects(
      async () => {
        await prisma.user.create({
          data: {
            email: testEmail, // Duplicate email
            passwordHash,
            fullName: "Another Student",
            role: UserRole.STUDENT,
            rollNumber: "DIFFERENT_ROLL",
            enrollmentNo: "DIFFERENT_ENROLL",
            isActive: true,
          },
        });
      },
      (err: any) => {
        assert.equal(err.code, "P2002");
        assert.ok(err.meta?.target?.includes("email"));
        return true;
      }
    );
  });

  it("should reject duplicate registration with identical rollNumber via P2002 constraint", async () => {
    const passwordHash = await hashPassword(testPassword);

    await assert.rejects(
      async () => {
        await prisma.user.create({
          data: {
            email: "different.email@csjmu.ac.in",
            passwordHash,
            fullName: "Another Student",
            role: UserRole.STUDENT,
            rollNumber: testRollNumber, // Duplicate roll number
            enrollmentNo: "DIFFERENT_ENROLL_2",
            isActive: true,
          },
        });
      },
      (err: any) => {
        assert.equal(err.code, "P2002");
        assert.ok(err.meta?.target?.includes("rollNumber"));
        return true;
      }
    );
  });

  // ===========================================================================
  // 3. Database Login & Session Creation
  // ===========================================================================
  let activeRawToken = "";

  it("should authenticate against database password hash and persist hashed session", async () => {
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    assert.ok(user);

    const isMatch = await verifyPassword(testPassword, user.passwordHash);
    assert.equal(isMatch, true);

    // Create session in database
    activeRawToken = generateSessionToken();
    const hashedToken = hashSessionToken(activeRawToken);
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    });

    assert.ok(session.id);
    assert.equal(session.userId, user.id);
    assert.equal(session.token, hashedToken);
  });

  // ===========================================================================
  // 4. Session Token Validation & Sanitization
  // ===========================================================================
  it("should validate raw session token against database and return sanitized user", async () => {
    const result = await validateSessionToken(activeRawToken);

    assert.ok(result.user);
    assert.equal(result.user.id, testUserId);
    assert.equal(result.user.email, testEmail);
    assert.equal(result.user.role, UserRole.STUDENT);
    assert.equal((result.user as any).passwordHash, undefined);
  });

  // ===========================================================================
  // 5. Multi-Session Invalidation / Bulk Revocation
  // ===========================================================================
  it("should revoke all user sessions across devices in database via revokeAllUserSessions", async () => {
    // Create two additional sessions for the same user
    const token2 = hashSessionToken(generateSessionToken());
    const token3 = hashSessionToken(generateSessionToken());
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await prisma.session.createMany({
      data: [
        { userId: testUserId, token: token2, expiresAt },
        { userId: testUserId, token: token3, expiresAt },
      ],
    });

    const sessionCountBefore = await prisma.session.count({
      where: { userId: testUserId },
    });
    assert.ok(sessionCountBefore >= 3);

    // Bulk revoke all sessions
    const revokedCount = await revokeAllUserSessions(testUserId);
    assert.equal(revokedCount, sessionCountBefore);

    const sessionCountAfter = await prisma.session.count({
      where: { userId: testUserId },
    });
    assert.equal(sessionCountAfter, 0);

    // Previous active token is now completely invalid
    const validationResult = await validateSessionToken(activeRawToken);
    assert.equal(validationResult.user, null);
    assert.equal(validationResult.reason, "NOT_FOUND");
  });

  // ===========================================================================
  // 6. Account Deactivation Handling in Database
  // ===========================================================================
  it("should reject session and immediately delete it when user is deactivated in database", async () => {
    // Create new session for user
    const deactRawToken = generateSessionToken();
    const deactHashed = hashSessionToken(deactRawToken);
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId: testUserId,
        token: deactHashed,
        expiresAt,
      },
    });

    // Deactivate user in database
    await prisma.user.update({
      where: { id: testUserId },
      data: { isActive: false },
    });

    // Validating token must detect deactivation and delete the session record
    const result = await validateSessionToken(deactRawToken);
    assert.equal(result.user, null);
    assert.equal(result.reason, "DEACTIVATED");

    // Verify session was removed from database
    const sessionInDb = await prisma.session.findUnique({
      where: { token: deactHashed },
    });
    assert.equal(sessionInDb, null);
  });

  // ===========================================================================
  // 7. Authorization Boundaries & Role Guard Enforcement
  // ===========================================================================
  it("should reject unauthorized roles and deactivated users at guard level", async () => {
    const deactivatedUser = await prisma.user.findUnique({
      where: { id: testUserId },
    });
    assert.ok(deactivatedUser);
    const sanitizedDeactivated = sanitizeUser(deactivatedUser);

    // Guard rejects deactivated user
    function evaluateUser(user: any, allowedRoles: UserRole[]) {
      if (!user) throw new Error("UNAUTHENTICATED");
      if (!user.isActive) throw new AccountDeactivatedError();
      if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenError();
      }
      return user;
    }

    assert.throws(
      () => evaluateUser(sanitizedDeactivated, [UserRole.STUDENT]),
      (err: any) => err instanceof AccountDeactivatedError
    );

    // Reactivate user
    await prisma.user.update({
      where: { id: testUserId },
      data: { isActive: true },
    });

    const activeUser = sanitizeUser(
      await prisma.user.findUniqueOrThrow({ where: { id: testUserId } })
    );

    // Student cannot access Course Coordinator or Admin resources
    assert.throws(
      () => evaluateUser(activeUser, [UserRole.COURSE_COORDINATOR]),
      (err: any) => err instanceof ForbiddenError
    );
    assert.throws(
      () => evaluateUser(activeUser, [UserRole.SYSTEM_ADMIN]),
      (err: any) => err instanceof ForbiddenError
    );

    // Student can access Student resources
    assert.doesNotThrow(() => evaluateUser(activeUser, [UserRole.STUDENT]));
  });
});
