import { NextResponse } from "next/server";
import { requireRole, handleAuthError } from "@/lib/auth/guard";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    // Enforce role authorization on the server: Only Director or System Admin
    const user = await requireRole([
      UserRole.SYSTEM_ADMIN,
      UserRole.DIRECTOR,
    ]);

    return NextResponse.json({
      success: true,
      message: `Access granted to executive resource for role '${user.role}'.`,
      actor: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      audit: {
        timestamp: new Date().toISOString(),
        clearanceLevel: "EXECUTIVE_ADMIN",
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
