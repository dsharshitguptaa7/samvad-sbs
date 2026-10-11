import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth/guard";
import { provisionStaffSchema } from "@/lib/auth/validation";
import { createPasswordResetToken } from "@/lib/auth/password-reset";
import { hashPassword } from "@/lib/auth/password";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/staff
 * List all staff accounts with their roles, active assignments, and status.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole([UserRole.SYSTEM_ADMIN]);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const roleFilter = searchParams.get("role") || "";
    const statusFilter = searchParams.get("status") || "";

    const whereClause: any = {
      role: {
        in: [UserRole.COURSE_COORDINATOR, UserRole.DEPARTMENT_HEAD, UserRole.DIRECTOR],
      },
    };

    if (roleFilter && Object.values(UserRole).includes(roleFilter as UserRole)) {
      whereClause.role = roleFilter as UserRole;
    }

    if (statusFilter === "active") {
      whereClause.isActive = true;
    } else if (statusFilter === "inactive") {
      whereClause.isActive = false;
    }

    if (search) {
      whereClause.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const staffUsers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phoneNumber: true,
        isActive: true,
        mustResetPassword: true,
        createdAt: true,
        staffAssignments: {
          select: {
            id: true,
            role: true,
            isActive: true,
            assignedAt: true,
            unassignedAt: true,
            department: {
              select: { id: true, name: true, code: true },
            },
            course: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
    });

    return NextResponse.json({
      success: true,
      staff: staffUsers,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/staff error:", error);
    return NextResponse.json({ success: false, error: "Failed to load staff accounts." }, { status: 500 });
  }
}

/**
 * POST /api/admin/staff
 * Provision a new staff account (COURSE_COORDINATOR, DEPARTMENT_HEAD, DIRECTOR).
 * Generates an initial password setup link token and logs SystemAuditLog.
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireRole([UserRole.SYSTEM_ADMIN]);

    const body = await request.json();
    const validationResult = provisionStaffSchema.safeParse(body);

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

    const { email, fullName, role, phoneNumber } = validationResult.data;

    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `An account with email '${email}' already exists.`,
          code: "DUPLICATE_EMAIL",
        },
        { status: 409 }
      );
    }

    // Generate random placeholder password hash (never stored or emailed in plaintext)
    const randomEntropy = crypto.randomBytes(32).toString("hex");
    const placeholderHash = await hashPassword(randomEntropy + "Aa1!");
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    // Atomically create user and write audit log
    const { newUser } = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            fullName,
            role,
            phoneNumber: phoneNumber || null,
            passwordHash: placeholderHash,
            isActive: true,
            mustResetPassword: true,
          },
        });

        // Write SystemAuditLog
        await tx.systemAuditLog.create({
          data: {
            adminUserId: adminUser.id,
            action: "STAFF_USER_PROVISIONED",
            targetModel: "User",
            targetId: user.id,
            details: {
              email: user.email,
              fullName: user.fullName,
              role: user.role,
            },
            ipAddress: clientIp,
          },
        });

        return { newUser: user };
      },
      { timeout: 15000, maxWait: 10000 }
    );

    // Create single-use first-login setup token
    const { rawToken, expiresAt } = await createPasswordResetToken(newUser.id);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          phoneNumber: newUser.phoneNumber,
          isActive: newUser.isActive,
          mustResetPassword: newUser.mustResetPassword,
        },
        setupToken: {
          token: rawToken,
          expiresAt: expiresAt.toISOString(),
          setupUrl: `/reset-password?token=${rawToken}`,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/admin/staff error:", error);
    return NextResponse.json({ success: false, error: "Failed to provision staff account." }, { status: 500 });
  }
}
