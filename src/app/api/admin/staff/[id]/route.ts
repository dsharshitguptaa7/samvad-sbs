import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth/guard";
import { updateStaffProfileSchema } from "@/lib/auth/validation";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { createPasswordResetToken } from "@/lib/auth/password-reset";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/staff/[id]
 * Update staff profile or activate/deactivate account.
 * When deactivating, revokes all active sessions immediately.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireRole([UserRole.SYSTEM_ADMIN]);
    const { id } = params;

    const body = await request.json();
    const validationResult = updateStaffProfileSchema.safeParse(body);

    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      const formattedErrors = Object.entries(fieldErrors)
        .map(([field, msgs]) => `${field}: ${(msgs || []).join(", ")}`)
        .join("; ");

      return NextResponse.json(
        {
          success: false,
          error: formattedErrors ? `Validation failed: ${formattedErrors}` : "Validation failed.",
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Staff member not found." },
        { status: 404 }
      );
    }

    // Do not allow mutating admin or student roles through this endpoint
    if (targetUser.role === UserRole.SYSTEM_ADMIN || targetUser.role === UserRole.STUDENT) {
      return NextResponse.json(
        { success: false, error: "This endpoint only manages staff authority accounts." },
        { status: 403 }
      );
    }

    const { fullName, phoneNumber, isActive } = validationResult.data;
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: {
          fullName: fullName ?? targetUser.fullName,
          phoneNumber: phoneNumber !== undefined ? phoneNumber : targetUser.phoneNumber,
          isActive: isActive !== undefined ? isActive : targetUser.isActive,
        },
      });

      // SystemAuditLog
      await tx.systemAuditLog.create({
        data: {
          adminUserId: adminUser.id,
          action: isActive !== undefined && isActive !== targetUser.isActive
            ? (isActive ? "STAFF_ACCOUNT_ACTIVATED" : "STAFF_ACCOUNT_DEACTIVATED")
            : "STAFF_PROFILE_UPDATED",
          targetModel: "User",
          targetId: u.id,
          details: {
            previousState: {
              fullName: targetUser.fullName,
              phoneNumber: targetUser.phoneNumber,
              isActive: targetUser.isActive,
            },
            newState: {
              fullName: u.fullName,
              phoneNumber: u.phoneNumber,
              isActive: u.isActive,
            },
          },
          ipAddress: clientIp,
        },
      });

      return u;
    });

    // If account was deactivated, revoke all user sessions immediately
    if (isActive === false) {
      await revokeAllUserSessions(id);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        role: updated.role,
        phoneNumber: updated.phoneNumber,
        isActive: updated.isActive,
      },
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("PATCH /api/admin/staff/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update staff account." }, { status: 500 });
  }
}

/**
 * POST /api/admin/staff/[id]
 * Initiate a fresh password reset / setup link for a staff account.
 * Action: 'reset-password'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireRole([UserRole.SYSTEM_ADMIN]);
    const { id } = params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Staff member not found." },
        { status: 404 }
      );
    }

    if (!targetUser.isActive) {
      return NextResponse.json(
        { success: false, error: "Cannot issue password reset link for a deactivated account." },
        { status: 400 }
      );
    }

    const { rawToken, expiresAt } = await createPasswordResetToken(id);
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    // Revoke any existing active sessions
    await revokeAllUserSessions(id);

    // Audit log
    await prisma.systemAuditLog.create({
      data: {
        adminUserId: adminUser.id,
        action: "STAFF_PASSWORD_RESET_INITIATED",
        targetModel: "User",
        targetId: id,
        details: {
          staffEmail: targetUser.email,
          staffRole: targetUser.role,
        },
        ipAddress: clientIp,
      },
    });

    return NextResponse.json({
      success: true,
      setupToken: {
        token: rawToken,
        expiresAt: expiresAt.toISOString(),
        setupUrl: `/reset-password?token=${rawToken}`,
      },
      message: `Password setup link issued for ${targetUser.fullName}.`,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/admin/staff/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to initiate password reset." }, { status: 500 });
  }
}
