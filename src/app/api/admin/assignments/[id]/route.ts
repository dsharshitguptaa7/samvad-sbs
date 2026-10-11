import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/assignments/[id]
 * Deactivate / unassign an authority assignment.
 * Sets isActive = false, unassignedAt = now(). Preserves historical records for audit trails.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireRole([UserRole.SYSTEM_ADMIN]);
    const { id } = params;

    const assignment = await prisma.staffAssignment.findUnique({
      where: { id },
      include: {
        user: { select: { fullName: true, email: true } },
        department: { select: { name: true } },
        course: { select: { name: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json({ success: false, error: "Assignment not found." }, { status: 404 });
    }

    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.staffAssignment.update({
        where: { id },
        data: {
          isActive: false,
          unassignedAt: new Date(),
        },
      });

      // Audit log
      await tx.systemAuditLog.create({
        data: {
          adminUserId: adminUser.id,
          action: "STAFF_AUTHORITY_UNASSIGNED",
          targetModel: "StaffAssignment",
          targetId: id,
          details: {
            staffName: assignment.user.fullName,
            staffEmail: assignment.user.email,
            role: assignment.role,
            departmentName: assignment.department.name,
            courseName: assignment.course?.name || null,
          },
          ipAddress: clientIp,
        },
      });

      return u;
    });

    return NextResponse.json({
      success: true,
      message: "Authority assignment deactivated.",
      assignment: updated,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("DELETE /api/admin/assignments/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to deactivate assignment." }, { status: 500 });
  }
}
