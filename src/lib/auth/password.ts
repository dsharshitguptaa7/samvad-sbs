import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash plaintext password using bcrypt with 12 salt rounds.
 * Never stores or logs plaintext passwords.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Verify a plaintext password candidate against an existing bcrypt hash.
 * Constant-time comparison prevents timing attacks.
 */
export async function verifyPassword(
  plaintext: string,
  hashedPassword: string
): Promise<boolean> {
  if (!plaintext || !hashedPassword) {
    return false;
  }
  try {
    return await bcrypt.compare(plaintext, hashedPassword);
  } catch {
    return false;
  }
}

/**
 * Pre-computed 12-round bcrypt hash used for dummy comparisons.
 * Ensures consistent execution time (~70-100ms) for non-existent users,
 * mitigating timing-based user enumeration attacks.
 */
export const DUMMY_BCRYPT_HASH =
  "$2b$12$otHsc4cwxTRbdXfwTTpCIOoFf8CdsMeoG/uPCp0YGHF2bhfKruTXa";

/**
 * Execute a dummy bcrypt comparison in constant time to prevent
 * username/rollNumber enumeration via response latency differences.
 */
export async function dummyVerifyPassword(candidate: string): Promise<boolean> {
  return verifyPassword(candidate || "dummy", DUMMY_BCRYPT_HASH);
}

/**
 * Validate password complexity:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit or special character
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  message?: string;
} {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long.",
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter.",
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter.",
    };
  }
  if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one number or special character.",
    };
  }
  return { valid: true };
}
