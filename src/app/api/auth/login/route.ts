import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/auth/validation";
import { verifyPassword, dummyVerifyPassword } from "@/lib/auth/password";
import { createSession, sanitizeUser } from "@/lib/auth/session";
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from "@/lib/auth/rate-limit";
import { UserRole } from "@prisma/client";
import { resolvePostLoginRedirect } from "@/lib/auth/role-routing";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Input Validation
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input parameters.",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { identifier, password, portalType, redirect: requestedRedirect } = validationResult.data;

    // 2. Brute-Force Rate Limiting Check
    // Identifier-based key (lowercased)
    const rateLimitKey = `login:${identifier.toLowerCase()}`;
    const rateStatus = checkRateLimit(rateLimitKey);

    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed login attempts. Please try again in ${rateStatus.retryAfterSeconds} seconds.`,
          code: "RATE_LIMITED",
          retryAfter: rateStatus.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateStatus.retryAfterSeconds),
          },
        }
      );
    }

    // 3. User Lookup (Identifier can be email or rollNumber)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { rollNumber: identifier },
        ],
      },
    });

    // 4. Constant-Time Verification / Safe Failure
    // If user does not exist, run a dummy bcrypt comparison to thwart timing enumeration
    if (!user) {
      await dummyVerifyPassword(password);
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials. Please verify your details and try again.",
        },
        { status: 401 }
      );
    }

    // 5. Account Deactivation Check
    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Your account has been deactivated. Please contact the university administrator.",
          code: "ACCOUNT_DEACTIVATED",
        },
        { status: 403 }
      );
    }

    // 6. Verify Password
    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials. Please verify your details and try again.",
        },
        { status: 401 }
      );
    }

    // 7. Portal Type Validation (Ensure students don't log into staff console and vice versa)
    if (portalType === "staff" && user.role === UserRole.STUDENT) {
      return NextResponse.json(
        {
          success: false,
          error: "Student accounts cannot access the Faculty & Staff Console. Please use the Student Portal.",
          code: "PORTAL_MISMATCH",
        },
        { status: 403 }
      );
    }

    if (portalType === "student" && user.role !== UserRole.STUDENT) {
      return NextResponse.json(
        {
          success: false,
          error: "Faculty & Staff accounts should access the Faculty & Staff Console.",
          code: "PORTAL_MISMATCH",
        },
        { status: 403 }
      );
    }

    // 8. Successful Authentication -> Reset Rate Limit
    resetRateLimit(rateLimitKey);

    // 9. Session Fixation Defense: Create completely fresh session token
    await createSession(user.id);

    // 10. Centralized Server-Authoritative Destination Resolution
    const redirectUrl = resolvePostLoginRedirect(
      user.role,
      requestedRedirect || request.nextUrl.searchParams.get("redirect")
    );

    // 11. Return Sanitized User (Never exposes passwordHash or session token)
    return NextResponse.json(
      {
        success: true,
        message: "Sign in successful.",
        user: sanitizeUser(user),
        redirectUrl,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Login processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to process login request. Please try again.",
      },
      { status: 500 }
    );
  }
}
