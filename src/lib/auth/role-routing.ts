import { UserRole } from "@prisma/client";

/**
 * Server-authoritative mapping of UserRole to primary workspace dashboard.
 */
export const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  [UserRole.SYSTEM_ADMIN]: "/admin",
  [UserRole.STUDENT]: "/student",
  [UserRole.COURSE_COORDINATOR]: "/coordinator",
  [UserRole.DEPARTMENT_HEAD]: "/department-head",
  [UserRole.DIRECTOR]: "/director",
};

/**
 * Retrieve the canonical dashboard path for a given user role.
 */
export function getRoleDashboardPath(role: UserRole | string | null | undefined): string {
  if (!role) return "/";
  if (role in ROLE_DASHBOARD_MAP) {
    return ROLE_DASHBOARD_MAP[role as UserRole];
  }
  return "/";
}

/**
 * Validate that a redirect target is a safe, relative, local path.
 * Thwarts open redirect vulnerabilities, protocol-relative bypasses, CRLF injection,
 * and circular redirects back to the login page.
 */
export function isSafeLocalRedirect(target: string | null | undefined): boolean {
  if (!target || typeof target !== "string") {
    return false;
  }

  const trimmed = target.trim();
  if (!trimmed) {
    return false;
  }

  // Must begin with a single forward slash
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return false;
  }

  // Prevent backslash character injection (used to fool URL parsers in some browsers)
  if (trimmed.includes("\\")) {
    return false;
  }

  // Prevent CRLF injection
  if (/[\r\n]/.test(trimmed)) {
    return false;
  }

  // Prevent dangerous pseudo-protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("/javascript:") ||
    lower.startsWith("/data:") ||
    lower.startsWith("/vbscript:")
  ) {
    return false;
  }

  // Prevent circular redirects to /login
  try {
    // Parse using dummy base to inspect clean pathname
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.pathname === "/login" || parsed.pathname.startsWith("/login/")) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

/**
 * Check whether a user with the specified role is permitted to access a given pathname.
 */
export function isRoleAuthorizedForPath(
  role: UserRole | string | null | undefined,
  targetPath: string
): boolean {
  if (!role) return false;

  let pathname = targetPath;
  try {
    const parsed = new URL(targetPath, "http://localhost");
    pathname = parsed.pathname;
  } catch {
    // If URL parsing fails, extract path before '?' or '#'
    pathname = targetPath.split("?")[0].split("#")[0];
  }

  // Public pages are accessible to any authenticated user
  const isPublicPage =
    pathname === "/" ||
    pathname === "/track" ||
    pathname.startsWith("/track/") ||
    pathname === "/register" ||
    pathname === "/reset-password";

  if (isPublicPage) {
    return true;
  }

  // Admin routes: SYSTEM_ADMIN only
  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin")) {
    return role === UserRole.SYSTEM_ADMIN;
  }

  // Student routes: STUDENT only
  if (pathname === "/student" || pathname.startsWith("/student/") || pathname.startsWith("/api/student")) {
    return role === UserRole.STUDENT;
  }

  // Coordinator routes: COURSE_COORDINATOR only
  if (
    pathname === "/coordinator" ||
    pathname.startsWith("/coordinator/") ||
    pathname.startsWith("/api/coordinator")
  ) {
    return role === UserRole.COURSE_COORDINATOR;
  }

  // Department Head routes: DEPARTMENT_HEAD only
  if (
    pathname === "/department-head" ||
    pathname.startsWith("/department-head/") ||
    pathname.startsWith("/api/department-head")
  ) {
    return role === UserRole.DEPARTMENT_HEAD;
  }

  // Director routes: DIRECTOR only
  if (
    pathname === "/director" ||
    pathname.startsWith("/director/") ||
    pathname.startsWith("/api/director")
  ) {
    return role === UserRole.DIRECTOR;
  }

  // Protected samples / executive: SYSTEM_ADMIN or DIRECTOR
  if (pathname.startsWith("/api/protected")) {
    return role === UserRole.SYSTEM_ADMIN || role === UserRole.DIRECTOR;
  }

  // Documents API: Any authenticated role EXCEPT SYSTEM_ADMIN (separation of powers)
  if (pathname.startsWith("/api/documents")) {
    return role !== UserRole.SYSTEM_ADMIN;
  }

  return false;
}

/**
 * Server-authoritative resolution of post-login destination.
 * If requestedRedirect is safe and the user's role is authorized for it, return it.
 * Otherwise, return the canonical role dashboard.
 */
export function resolvePostLoginRedirect(
  role: UserRole | string | null | undefined,
  requestedRedirect?: string | null
): string {
  const defaultDashboard = getRoleDashboardPath(role);

  if (!requestedRedirect) {
    return defaultDashboard;
  }

  if (!isSafeLocalRedirect(requestedRedirect)) {
    return defaultDashboard;
  }

  if (!isRoleAuthorizedForPath(role, requestedRedirect)) {
    return defaultDashboard;
  }

  return requestedRedirect;
}
