import crypto from "crypto";
import prisma from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "./password";
import { revokeAllUserSessions } from "./session";

// Reset tokens expire after 24 hours (86,400 seconds)
export const RESET_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Generate a cryptographically secure 256-bit reset token.
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Compute SHA-256 digest of raw reset token before database persistence.
 * Prevents token exposure in the event of database exfiltration.
 */
export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Issue a new password reset / first-login token for a target user.
 * Invalidates any existing unused tokens for that user.
 * Returns the single-use raw token for administrative delivery.
 */
export async function createPasswordResetToken(userId: string): Promise<{
  rawToken: string;
  expiresAt: Date;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (!user.isActive) {
    throw new Error("Cannot issue password setup token for a deactivated account.");
  }

  const rawToken = generateResetToken();
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  // Invalidate any previously unused tokens for this user and store new token atomically
  await prisma.$transaction(
    async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      });

      await tx.passwordResetToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
        },
      });
    },
    { timeout: 15000, maxWait: 10000 }
  );

  return { rawToken, expiresAt };
}

export type ValidateResetTokenResult =
  | { valid: true; userId: string; userEmail: string; fullName: string; role: string; mustReset: boolean }
  | { valid: false; reason: "INVALID_TOKEN" | "EXPIRED" | "ALREADY_USED" | "ACCOUNT_DEACTIVATED" };

/**
 * Validate a raw reset token against the database without consuming it.
 */
export async function validateResetToken(rawToken: string): Promise<ValidateResetTokenResult> {
  if (!rawToken || typeof rawToken !== "string" || rawToken.length < 32) {
    return { valid: false, reason: "INVALID_TOKEN" };
  }

  const tokenHash = hashResetToken(rawToken);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          mustResetPassword: true,
        },
      },
    },
  });

  if (!record) {
    return { valid: false, reason: "INVALID_TOKEN" };
  }

  if (record.usedAt) {
    return { valid: false, reason: "ALREADY_USED" };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: "EXPIRED" };
  }

  if (!record.user.isActive) {
    return { valid: false, reason: "ACCOUNT_DEACTIVATED" };
  }

  return {
    valid: true,
    userId: record.user.id,
    userEmail: record.user.email,
    fullName: record.user.fullName,
    role: record.user.role,
    mustReset: record.user.mustResetPassword,
  };
}

/**
 * Consume a reset token and set a new password.
 * Atomically:
 * 1. Validates token (single-use, unexpired, user active).
 * 2. Validates password complexity.
 * 3. Updates user's passwordHash and sets mustResetPassword = false.
 * 4. Marks token as used (usedAt = now()).
 * 5. Revokes all active sessions across all devices for the target user.
 */
export async function consumePasswordResetToken(
  rawToken: string,
  newPassword: string
): Promise<{ success: boolean; userId: string; error?: string }> {
  const tokenValidation = await validateResetToken(rawToken);

  if (!tokenValidation.valid) {
    const errorMap: Record<string, string> = {
      INVALID_TOKEN: "The password setup link is invalid.",
      EXPIRED: "The password setup link has expired. Please request a new link.",
      ALREADY_USED: "This password setup link has already been used.",
      ACCOUNT_DEACTIVATED: "This account is deactivated. Please contact the administrator.",
    };
    return {
      success: false,
      userId: "",
      error: errorMap[tokenValidation.reason] || "Invalid password setup request.",
    };
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return {
      success: false,
      userId: tokenValidation.userId,
      error: strength.message || "Password does not meet complexity requirements.",
    };
  }

  const tokenHash = hashResetToken(rawToken);
  const newHash = await hashPassword(newPassword);

  // Execute atomic password update, token burn, and session revocation
  await prisma.$transaction(
    async (tx) => {
      // 1. Mark token as consumed
      await tx.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      });

      // 2. Update user credentials
      await tx.user.update({
        where: { id: tokenValidation.userId },
        data: {
          passwordHash: newHash,
          mustResetPassword: false,
        },
      });

      // 3. Clear all active sessions
      await tx.session.deleteMany({
        where: { userId: tokenValidation.userId },
      });
    },
    { timeout: 15000, maxWait: 10000 }
  );

  return { success: true, userId: tokenValidation.userId };
}
