import { UserRole } from "@prisma/client";
import { getSessionUser, AuthUser } from "./session";
import { NextResponse } from "next/server";

export class AuthenticationError extends Error {
  statusCode = 401;
  code = "UNAUTHENTICATED";
  constructor(message = "Authentication required. Please sign in.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  code = "FORBIDDEN";
  constructor(message = "Access denied. Insufficient permissions for this resource.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class AccountDeactivatedError extends Error {
  statusCode = 403;
  code = "ACCOUNT_DEACTIVATED";
  constructor(message = "Your account has been deactivated. Please contact the administrator.") {
    super(message);
    this.name = "AccountDeactivatedError";
  }
}

/**
 * Require valid authenticated user for current server context.
 * Throws AuthenticationError if not logged in, or AccountDeactivatedError if deactivated.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthenticationError();
  }
  if (!user.isActive) {
    throw new AccountDeactivatedError();
  }
  return user;
}

/**
 * Require that current user has one of the specified roles.
 * Throws ForbiddenError if user role is not permitted.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `Access denied: required one of [${allowedRoles.join(", ")}], current role is '${user.role}'`
    );
  }
  return user;
}

/**
 * Role-specific convenience guards.
 */
export async function requireStudent(): Promise<AuthUser> {
  return requireRole([UserRole.STUDENT]);
}

export async function requireCoordinator(): Promise<AuthUser> {
  return requireRole([UserRole.COURSE_COORDINATOR]);
}

export async function requireDepartmentHead(): Promise<AuthUser> {
  return requireRole([UserRole.DEPARTMENT_HEAD]);
}

export async function requireDirector(): Promise<AuthUser> {
  return requireRole([UserRole.DIRECTOR]);
}

export async function requireSystemAdmin(): Promise<AuthUser> {
  return requireRole([UserRole.SYSTEM_ADMIN]);
}

/**
 * Helper to generate safe HTTP JSON error responses for API routes.
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthenticationError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: 401 }
    );
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: 403 }
    );
  }
  if (error instanceof AccountDeactivatedError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: 403 }
    );
  }
  return NextResponse.json(
    { success: false, error: "An unexpected authorization error occurred." },
    { status: 500 }
  );
}
