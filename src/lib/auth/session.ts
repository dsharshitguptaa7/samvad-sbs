import crypto from "crypto";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const SESSION_COOKIE_NAME = "samvad_session";
export const SESSION_DURATION_SECONDS = 8 * 60 * 60; // 8 hours

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  rollNumber: string | null;
  enrollmentNo: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  mustResetPassword: boolean;
  createdAt: Date;
}

export interface SessionValidationResult {
  user: AuthUser | null;
  sessionId: string | null;
  reason?: "UNAUTHENTICATED" | "EXPIRED" | "DEACTIVATED" | "NOT_FOUND";
}

/**
 * Generate a cryptographically secure random session token (256-bit entropy).
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash session token using SHA-256 before database storage.
 * Database breaches will not expose raw active session tokens.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Strip password hashes, session tokens, and sensitive internal fields.
 */
export function sanitizeUser(user: any): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    rollNumber: user.rollNumber ?? null,
    enrollmentNo: user.enrollmentNo ?? null,
    phoneNumber: user.phoneNumber ?? null,
    isActive: Boolean(user.isActive),
    mustResetPassword: Boolean(user.mustResetPassword),
    createdAt: user.createdAt,
  };
}

/**
 * Create a new database session and set HTTP-only cookie.
 * Defends against session fixation by generating a fresh token.
 */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const rawToken = generateSessionToken();
  const hashedToken = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  // Store hashed token in database
  await prisma.session.create({
    data: {
      userId,
      token: hashedToken,
      expiresAt,
    },
  });

  // Set HTTP-only, secure cookie with exact path and expiry
  try {
    const cookieStore = cookies();
    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: rawToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
      expires: expiresAt,
    });
  } catch {
    // In test runners or background tasks outside Next.js request context, cookies() is not available
  }

  return { token: rawToken, expiresAt };
}

/**
 * Validate a raw session token against the database.
 * Enforces account active status and expiration.
 */
export async function validateSessionToken(rawToken: string): Promise<SessionValidationResult> {
  if (!rawToken || typeof rawToken !== "string") {
    return { user: null, sessionId: null, reason: "UNAUTHENTICATED" };
  }

  const hashedToken = hashSessionToken(rawToken);

  const session = await prisma.session.findUnique({
    where: { token: hashedToken },
    include: {
      user: true,
    },
  });

  if (!session) {
    return { user: null, sessionId: null, reason: "NOT_FOUND" };
  }

  // Check expiration
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return { user: null, sessionId: null, reason: "EXPIRED" };
  }

  // Check account active status (Deactivation Handling)
  if (!session.user.isActive) {
    // Invalidate session immediately if account has been deactivated
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return { user: null, sessionId: null, reason: "DEACTIVATED" };
  }

  return {
    user: sanitizeUser(session.user),
    sessionId: session.id,
  };
}

/**
 * Read session cookie and validate user for current server request.
 */
export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }

    const result = await validateSessionToken(token);
    if (!result.user && (result.reason === "EXPIRED" || result.reason === "DEACTIVATED")) {
      // Clear cookie if expired or deactivated (safely ignored in read-only Server Component contexts)
      try {
        cookieStore.set({
          name: SESSION_COOKIE_NAME,
          value: "",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 0,
          expires: new Date(0),
        });
      } catch {
        // Expected in Server Component rendering contexts where cookies() is read-only
      }
    }

    return result.user;
  } catch {
    return null;
  }
}

/**
 * Invalidate current session from database and clear cookie.
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      const hashedToken = hashSessionToken(token);
      await prisma.session.deleteMany({
        where: { token: hashedToken },
      });
    }

    try {
      cookieStore.set({
        name: SESSION_COOKIE_NAME,
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
    } catch {
      try {
        cookieStore.delete(SESSION_COOKIE_NAME);
      } catch {}
    }
  } catch (err) {
    // Ensure cookie is deleted even if database delete encounters an issue
    try {
      cookies().set({
        name: SESSION_COOKIE_NAME,
        value: "",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
    } catch {}
  }
}

/**
 * Invalidate all active sessions for a specific user across all devices.
 * Essential for immediate revocation during administrative account deactivation,
 * password resets, or incident response.
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const result = await prisma.session.deleteMany({
      where: { userId },
    });
    return result.count;
  } catch (error) {
    console.error(`Failed to revoke sessions for user ${userId}:`, error);
    throw error;
  }
}
