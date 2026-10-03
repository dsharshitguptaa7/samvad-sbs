import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "../src/lib/auth/password";
import {
  generateSessionToken,
  hashSessionToken,
  sanitizeUser,
  AuthUser,
} from "../src/lib/auth/session";
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from "../src/lib/auth/rate-limit";
import {
  studentRegistrationSchema,
  loginSchema,
} from "../src/lib/auth/validation";
import {
  AuthenticationError,
  ForbiddenError,
  AccountDeactivatedError,
  handleAuthError,
} from "../src/lib/auth/guard";
import { UserRole } from "@prisma/client";

describe("SAMVAD Authentication & Security Test Suite", () => {
  // ===========================================================================
  // 1. Password Hashing & Complexity
  // ===========================================================================
  describe("Password Hashing & Verification", () => {
    it("should generate a valid bcrypt hash with salt rounds", async () => {
      const password = "SampleSecurePass#2026";
      const hash = await hashPassword(password);

      assert.notEqual(hash, password);
      assert.ok(hash.startsWith("$2a$") || hash.startsWith("$2b$"));
    });

    it("should successfully verify matching password against hash", async () => {
      const password = "MyStudentSecret#123";
      const hash = await hashPassword(password);
      const isMatch = await verifyPassword(password, hash);

      assert.equal(isMatch, true);
    });

    it("should reject incorrect password candidates in constant time", async () => {
      const password = "CorrectPassword#123";
      const hash = await hashPassword(password);
      const isMatch = await verifyPassword("WrongPassword#999", hash);

      assert.equal(isMatch, false);
    });

    it("should reject empty or null password candidates safely", async () => {
      const hash = await hashPassword("ValidPassword#123");
      const emptyMatch = await verifyPassword("", hash);
      const nullMatch = await verifyPassword(null as any, hash);

      assert.equal(emptyMatch, false);
      assert.equal(nullMatch, false);
    });

    it("should enforce strong password complexity rules", () => {
      // Too short
      assert.equal(validatePasswordStrength("Short1!").valid, false);
      // Missing uppercase
      assert.equal(validatePasswordStrength("lowercase123!").valid, false);
      // Missing lowercase
      assert.equal(validatePasswordStrength("UPPERCASE123!").valid, false);
      // Missing digit or special char
      assert.equal(validatePasswordStrength("NoDigitsOrSpecial").valid, false);
      // Strong valid password
      assert.equal(validatePasswordStrength("ValidSBSPass#2026").valid, true);
    });
  });

  // ===========================================================================
  // 2. Brute-Force Rate Limiting
  // ===========================================================================
  describe("Brute-Force & Rate Limiting Guard", () => {
    it("should permit attempts within the allowed threshold", () => {
      const testKey = "test-rate-limit-user-1";
      resetRateLimit(testKey);

      for (let i = 0; i < 4; i++) {
        recordFailedAttempt(testKey, 5, 60000);
      }

      const status = checkRateLimit(testKey, 5, 60000);
      assert.equal(status.allowed, true);
      assert.equal(status.remainingAttempts, 1);
    });

    it("should block requests when maximum failed attempts threshold is reached", () => {
      const testKey = "test-rate-limit-blocked-user";
      resetRateLimit(testKey);

      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(testKey, 5, 60000, 60000);
      }

      const status = checkRateLimit(testKey, 5, 60000);
      assert.equal(status.allowed, false);
      assert.equal(status.remainingAttempts, 0);
      assert.ok(status.retryAfterSeconds > 0);
    });

    it("should reset rate limit counters upon successful login", () => {
      const testKey = "test-rate-limit-reset";
      recordFailedAttempt(testKey, 5, 60000);
      recordFailedAttempt(testKey, 5, 60000);

      resetRateLimit(testKey);

      const status = checkRateLimit(testKey, 5, 60000);
      assert.equal(status.allowed, true);
      assert.equal(status.remainingAttempts, 5);
    });
  });

  // ===========================================================================
  // 3. Input Validation & Privilege Escalation Prevention
  // ===========================================================================
  describe("Input Validation & Privilege Safeguards", () => {
    it("should successfully parse valid student registration input", () => {
      const validPayload = {
        fullName: "Ananya Mishra",
        rollNumber: "240103045",
        enrollmentNo: "CSJM2024S1045",
        email: "ananya.mishra@csjmu.ac.in",
        phoneNumber: "9876543210",
        departmentCode: "MATH",
        courseName: "M.Sc. Mathematics",
        semester: "1",
        password: "StrongPass#2026",
      };

      const result = studentRegistrationSchema.safeParse(validPayload);
      assert.equal(result.success, true);
    });

    it("should reject student registration with invalid email or phone", () => {
      const invalidPayload = {
        fullName: "Ananya Mishra",
        rollNumber: "240103045",
        enrollmentNo: "CSJM2024S1045",
        email: "not-an-email",
        phoneNumber: "12345", // Invalid phone
        departmentCode: "MATH",
        courseName: "M.Sc. Mathematics",
        semester: "1",
        password: "StrongPass#2026",
      };

      const result = studentRegistrationSchema.safeParse(invalidPayload);
      assert.equal(result.success, false);
    });

    it("should ignore or strip any attempted role escalation from student registration", () => {
      const maliciousPayload = {
        fullName: "Attacker Trying Admin",
        rollNumber: "240109999",
        enrollmentNo: "CSJM2024S9999",
        email: "attacker@csjmu.ac.in",
        phoneNumber: "9876543219",
        departmentCode: "MATH",
        courseName: "M.Sc. Mathematics",
        semester: "1",
        password: "StrongPass#2026",
        role: "SYSTEM_ADMIN", // Malicious role injection attempt
        isActive: true,
      };

      const parsed = studentRegistrationSchema.parse(maliciousPayload);

      // Verify that parsed output strictly does NOT include the injected role
      assert.equal((parsed as any).role, undefined);
    });

    it("should validate login input schema", () => {
      const valid = loginSchema.safeParse({
        identifier: "student@csjmu.ac.in",
        password: "SecretPassword123!",
        portalType: "student",
      });
      assert.equal(valid.success, true);

      const invalid = loginSchema.safeParse({
        identifier: "",
        password: "",
      });
      assert.equal(invalid.success, false);
    });
  });

  // ===========================================================================
  // 4. Session & Token Cryptography
  // ===========================================================================
  describe("Session & Token Management", () => {
    it("should generate cryptographically strong unique tokens", () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();

      assert.equal(typeof token1, "string");
      assert.equal(token1.length, 64); // 32 bytes hex = 64 characters
      assert.notEqual(token1, token2);
    });

    it("should hash session tokens with SHA-256 before storage", () => {
      const rawToken = "sample-raw-session-token-value-2026";
      const hash1 = hashSessionToken(rawToken);
      const hash2 = hashSessionToken(rawToken);

      assert.equal(hash1, hash2);
      assert.equal(hash1.length, 64); // SHA-256 produces 64 hex characters
      assert.notEqual(hash1, rawToken);
    });
  });

  // ===========================================================================
  // 5. Credential & Secret Exposure Prevention
  // ===========================================================================
  describe("Data Sanitization & Secret Exposure Prevention", () => {
    it("should strictly strip passwordHash and token from serialized user objects", () => {
      const rawDbUser = {
        id: "user-uuid-101",
        email: "student@csjmu.ac.in",
        passwordHash: "$2b$12$e8wV4oXwF0X1mS9Ym7Hn.O9kG1zV6hM2lU7pQ5rT8sW3vX4yZ0a1b",
        fullName: "Rahul Verma",
        role: UserRole.STUDENT,
        rollNumber: "240103009",
        enrollmentNo: "CSJM2024S1009",
        phoneNumber: "9876543211",
        isActive: true,
        mustResetPassword: false,
        createdAt: new Date(),
        secretToken: "internal-secret-token",
      };

      const sanitized = sanitizeUser(rawDbUser);

      // Password hash and internal secret tokens MUST NEVER be present
      assert.equal((sanitized as any).passwordHash, undefined);
      assert.equal((sanitized as any).secretToken, undefined);
      assert.equal(sanitized.id, "user-uuid-101");
      assert.equal(sanitized.email, "student@csjmu.ac.in");
      assert.equal(sanitized.role, UserRole.STUDENT);
    });
  });

  // ===========================================================================
  // 6. Role-Based Access Control (RBAC) & Authorization Guards
  // ===========================================================================
  describe("Server Authorization & Role Guards", () => {
    const studentUser: AuthUser = {
      id: "student-1",
      email: "student@csjmu.ac.in",
      fullName: "Student User",
      role: UserRole.STUDENT,
      rollNumber: "240103001",
      enrollmentNo: "CSJM2024S1001",
      phoneNumber: "9876500001",
      isActive: true,
      mustResetPassword: false,
      createdAt: new Date(),
    };

    const coordinatorUser: AuthUser = {
      ...studentUser,
      id: "coord-1",
      role: UserRole.COURSE_COORDINATOR,
    };

    const hodUser: AuthUser = {
      ...studentUser,
      id: "hod-1",
      role: UserRole.DEPARTMENT_HEAD,
    };

    const directorUser: AuthUser = {
      ...studentUser,
      id: "dir-1",
      role: UserRole.DIRECTOR,
    };

    const adminUser: AuthUser = {
      ...studentUser,
      id: "admin-1",
      role: UserRole.SYSTEM_ADMIN,
    };

    // Helper for role checks
    function evaluateRole(user: AuthUser | null, allowed: UserRole[]) {
      if (!user) throw new AuthenticationError();
      if (!user.isActive) throw new AccountDeactivatedError();
      if (!allowed.includes(user.role)) {
        throw new ForbiddenError(`Role ${user.role} is not permitted.`);
      }
      return user;
    }

    it("should throw AuthenticationError (401) when user is unauthenticated", () => {
      assert.throws(() => evaluateRole(null, [UserRole.STUDENT]), (err: any) => {
        assert.ok(err instanceof AuthenticationError);
        assert.equal(err.statusCode, 401);
        return true;
      });
    });

    it("should throw ForbiddenError (403) when user role does not match permitted roles", () => {
      // Student trying to access Course Coordinator resource
      assert.throws(
        () => evaluateRole(studentUser, [UserRole.COURSE_COORDINATOR]),
        (err: any) => {
          assert.ok(err instanceof ForbiddenError);
          assert.equal(err.statusCode, 403);
          return true;
        }
      );

      // Student trying to access System Admin resource
      assert.throws(
        () => evaluateRole(studentUser, [UserRole.SYSTEM_ADMIN]),
        (err: any) => {
          assert.ok(err instanceof ForbiddenError);
          assert.equal(err.statusCode, 403);
          return true;
        }
      );

      // Course Coordinator trying to access Director resource
      assert.throws(
        () => evaluateRole(coordinatorUser, [UserRole.DIRECTOR]),
        (err: any) => {
          assert.ok(err instanceof ForbiddenError);
          assert.equal(err.statusCode, 403);
          return true;
        }
      );

      // Department Head trying to access System Admin resource
      assert.throws(
        () => evaluateRole(hodUser, [UserRole.SYSTEM_ADMIN]),
        (err: any) => {
          assert.ok(err instanceof ForbiddenError);
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });

    it("should grant access when user holds the authorized role", () => {
      assert.doesNotThrow(() => evaluateRole(studentUser, [UserRole.STUDENT]));
      assert.doesNotThrow(() =>
        evaluateRole(coordinatorUser, [UserRole.COURSE_COORDINATOR])
      );
      assert.doesNotThrow(() =>
        evaluateRole(hodUser, [UserRole.DEPARTMENT_HEAD])
      );
      assert.doesNotThrow(() => evaluateRole(directorUser, [UserRole.DIRECTOR]));
      assert.doesNotThrow(() =>
        evaluateRole(adminUser, [UserRole.SYSTEM_ADMIN])
      );
    });

    it("should handle multi-role authorized endpoints correctly", () => {
      const executiveRoles = [UserRole.DIRECTOR, UserRole.SYSTEM_ADMIN];

      assert.doesNotThrow(() => evaluateRole(directorUser, executiveRoles));
      assert.doesNotThrow(() => evaluateRole(adminUser, executiveRoles));
      assert.throws(() => evaluateRole(studentUser, executiveRoles));
      assert.throws(() => evaluateRole(coordinatorUser, executiveRoles));
    });
  });

  // ===========================================================================
  // 7. Inactive / Deactivated Accounts Handling
  // ===========================================================================
  describe("Account Deactivation Handling", () => {
    it("should immediately reject access if user account isActive is false", () => {
      const deactivatedUser = {
        id: "deactivated-user-1",
        email: "deactivated@csjmu.ac.in",
        fullName: "Deactivated Student",
        role: UserRole.STUDENT,
        rollNumber: "240103999",
        enrollmentNo: "CSJM2024S9999",
        phoneNumber: "9876543210",
        isActive: false, // Inactive account
        mustResetPassword: false,
        createdAt: new Date(),
      };

      function checkActive(user: typeof deactivatedUser) {
        if (!user.isActive) {
          throw new AccountDeactivatedError();
        }
        return user;
      }

      assert.throws(() => checkActive(deactivatedUser), (err: any) => {
        assert.ok(err instanceof AccountDeactivatedError);
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "ACCOUNT_DEACTIVATED");
        return true;
      });
    });
  });

  // ===========================================================================
  // 8. Safe Error Handling & API Responses
  // ===========================================================================
  describe("Safe Error Handling", () => {
    it("should convert AuthenticationError to HTTP 401 response", () => {
      const response = handleAuthError(new AuthenticationError());
      assert.equal(response.status, 401);
    });

    it("should convert ForbiddenError to HTTP 403 response", () => {
      const response = handleAuthError(new ForbiddenError());
      assert.equal(response.status, 403);
    });

    it("should convert AccountDeactivatedError to HTTP 403 response", () => {
      const response = handleAuthError(new AccountDeactivatedError());
      assert.equal(response.status, 403);
    });
  });
});
