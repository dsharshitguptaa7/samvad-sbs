import { NextRequest, NextResponse } from "next/server";
import { validateResetToken, consumePasswordResetToken } from "@/lib/auth/password-reset";
import { resetPasswordSubmitSchema } from "@/lib/auth/validation";

/**
 * GET /api/auth/reset-password?token=RAW_TOKEN
 * Check validity of a password setup token without consuming it.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || "";

    const validation = await validateResetToken(token);

    if (!validation.valid) {
      const errorMap: Record<string, string> = {
        INVALID_TOKEN: "The setup link is invalid or incomplete.",
        EXPIRED: "The setup link has expired. Please contact the administrator for a fresh link.",
        ALREADY_USED: "This setup link has already been used.",
        ACCOUNT_DEACTIVATED: "This account is currently deactivated. Please contact the administrator.",
      };
      return NextResponse.json(
        {
          success: false,
          error: errorMap[validation.reason] || "Invalid token.",
          reason: validation.reason,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        email: validation.userEmail,
        fullName: validation.fullName,
        role: validation.role,
        mustReset: validation.mustReset,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/reset-password error:", error);
    return NextResponse.json({ success: false, error: "Failed to validate setup link." }, { status: 500 });
  }
}

/**
 * POST /api/auth/reset-password
 * Consume the setup token and set new password.
 * Atomically invalidates the token, updates the password hash, and clears all sessions.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = resetPasswordSubmitSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed.",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { token, password } = validationResult.data;

    const result = await consumePasswordResetToken(token, password);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to set password.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password configured successfully. You may now log in to the portal.",
    });
  } catch (error) {
    console.error("POST /api/auth/reset-password error:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred." }, { status: 500 });
  }
}
