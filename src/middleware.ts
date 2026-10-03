import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("samvad_session")?.value;

  // Protected route patterns
  const isProtectedPage =
    pathname.startsWith("/student") ||
    pathname.startsWith("/coordinator") ||
    pathname.startsWith("/department-head") ||
    pathname.startsWith("/director") ||
    pathname.startsWith("/admin");

  const isProtectedApi =
    pathname.startsWith("/api/protected") ||
    pathname.startsWith("/api/admin");

  if (!sessionCookie) {
    if (isProtectedApi) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required. No session cookie provided.",
          code: "UNAUTHENTICATED",
        },
        { status: 401 }
      );
    }

    if (isProtectedPage) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/student/:path*",
    "/coordinator/:path*",
    "/department-head/:path*",
    "/director/:path*",
    "/admin/:path*",
    "/api/protected/:path*",
    "/api/admin/:path*",
  ],
};
