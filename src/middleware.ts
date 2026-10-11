import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PAGE_PREFIXES = [
  "/student",
  "/coordinator",
  "/department-head",
  "/director",
  "/admin",
];

const PROTECTED_API_PREFIXES = [
  "/api/student",
  "/api/coordinator",
  "/api/department-head",
  "/api/director",
  "/api/admin",
  "/api/protected",
  "/api/documents",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("samvad_session")?.value;

  const isProtectedApi = PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // 1. Guard protected API endpoints - return 401 JSON immediately if unauthenticated
  if (isProtectedApi && !sessionCookie) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication required. Please sign in.",
        code: "UNAUTHENTICATED",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  }

  // 2. Guard protected pages: redirect unauthenticated users to login with safe redirect param
  if (isProtectedPage && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return response;
  }

  // 3. For all protected pages and APIs, ensure responses are never cached by browser bfcache
  const response = NextResponse.next();
  if (isProtectedPage || isProtectedApi) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

export const config = {
  matcher: [
    "/student/:path*",
    "/coordinator/:path*",
    "/department-head/:path*",
    "/director/:path*",
    "/admin/:path*",
    "/api/student/:path*",
    "/api/coordinator/:path*",
    "/api/department-head/:path*",
    "/api/director/:path*",
    "/api/admin/:path*",
    "/api/protected/:path*",
    "/api/documents/:path*",
  ],
};
