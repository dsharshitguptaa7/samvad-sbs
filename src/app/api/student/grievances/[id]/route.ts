import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/student/grievances/[id]
 * Enforces ownership: studentId === currentUser.id
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole([UserRole.STUDENT]);
    const grievanceId = params.id;

    const grievance = await prisma.grievance.findUnique({
      where: { id: grievanceId },
      include: {
        department: { select: { name: true, code: true } },
        course: { select: { name: true, code: true } },
        assignedTo: { select: { fullName: true, role: true } },
        documents: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            purpose: true,
            createdAt: true,
          },
        },
        documentRequests: {
          select: {
            id: true,
            instructions: true,
            deadline: true,
            status: true,
            createdAt: true,
            requestedTier: true,
          },
          orderBy: { createdAt: "desc" },
        },
        timelineActions: {
          where: { visibility: "PUBLIC_TO_STUDENT" },
          select: {
            id: true,
            actionType: true,
            fromTier: true,
            toTier: true,
            fromStatus: true,
            toStatus: true,
            remarks: true,
            createdAt: true,
            actor: { select: { fullName: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!grievance) {
      return NextResponse.json({ error: "Grievance not found" }, { status: 404 });
    }

    // Strict tenancy enforcement: student can only view their own grievance
    if (grievance.studentId !== user.id) {
      return NextResponse.json(
        { error: "Access denied. You do not own this grievance." },
        { status: 403 }
      );
    }

    return NextResponse.json({ grievance });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Failed to fetch grievance details" }, { status: 500 });
  }
}
