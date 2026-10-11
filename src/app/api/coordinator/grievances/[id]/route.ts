import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { UserRole } from "@prisma/client";
import {
  verifyCoordinatorAccess,
  coordinatorMarkUnderReview,
  coordinatorAddInternalRemark,
  coordinatorRequestDocuments,
  coordinatorForwardToHod,
  coordinatorResolveGrievance,
} from "@/lib/coordinator/workflow";
import {
  markUnderReviewSchema,
  addInternalRemarkSchema,
  createDocumentRequestSchema,
  forwardToHodSchema,
  resolveGrievanceSchema,
} from "@/lib/auth/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/coordinator/grievances/[id]
 * Returns full grievance details, documents, student information, and timeline
 * ONLY if the grievance belongs to one of the coordinator's assigned courses.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole([UserRole.COURSE_COORDINATOR]);
    const grievanceId = params.id;

    const access = await verifyCoordinatorAccess(user.id, grievanceId);
    if (!access.allowed || !access.grievance) {
      return NextResponse.json(
        { error: access.error || "Access denied" },
        { status: access.statusCode || 403 }
      );
    }

    // Fetch related documents, document requests, and full timeline (including internal remarks)
    const [documents, documentRequests, timelineActions] = await Promise.all([
      (await import("@/lib/prisma")).default.grievanceDocument.findMany({
        where: { grievanceId },
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          purpose: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      (await import("@/lib/prisma")).default.documentRequest.findMany({
        where: { grievanceId },
        select: {
          id: true,
          instructions: true,
          deadline: true,
          status: true,
          createdAt: true,
          requestedTier: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      (await import("@/lib/prisma")).default.grievanceTimelineAction.findMany({
        where: { grievanceId },
        select: {
          id: true,
          actionType: true,
          fromTier: true,
          toTier: true,
          fromStatus: true,
          toStatus: true,
          remarks: true,
          visibility: true,
          createdAt: true,
          actor: { select: { fullName: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return NextResponse.json({
      grievance: {
        ...access.grievance,
        documents,
        documentRequests,
        timelineActions,
      },
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Failed to fetch grievance details" }, { status: 500 });
  }
}

/**
 * POST /api/coordinator/grievances/[id]
 * Executes a validated workflow transition on the grievance.
 * Body: { action: "MARK_UNDER_REVIEW" | "ADD_INTERNAL_REMARK" | "REQUEST_DOCUMENTS" | "FORWARD_TO_HOD" | "RESOLVE", ...payload }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole([UserRole.COURSE_COORDINATOR]);
    const grievanceId = params.id;
    const body = await req.json();

    const action = body.action;
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const ctx = {
      coordinatorUserId: user.id,
      grievanceId,
      ipAddress,
      userAgent,
    };

    switch (action) {
      case "MARK_UNDER_REVIEW": {
        const parsed = markUnderReviewSchema.safeParse({ grievanceId, remarks: body.remarks });
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        const res = await coordinatorMarkUnderReview(ctx, parsed.data.remarks);
        if (!res.success) return NextResponse.json({ error: res.error }, { status: res.statusCode || 400 });
        return NextResponse.json({ message: "Grievance marked under review", grievance: res.grievance });
      }

      case "ADD_INTERNAL_REMARK": {
        const parsed = addInternalRemarkSchema.safeParse({ grievanceId, remarks: body.remarks });
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        const res = await coordinatorAddInternalRemark(ctx, parsed.data.remarks);
        if (!res.success) return NextResponse.json({ error: res.error }, { status: res.statusCode || 400 });
        return NextResponse.json({ message: "Internal remark added", grievance: res.grievance });
      }

      case "REQUEST_DOCUMENTS": {
        const parsed = createDocumentRequestSchema.safeParse({
          grievanceId,
          instructions: body.instructions,
          deadline: body.deadline || undefined,
        });
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        const deadlineDate = parsed.data.deadline ? new Date(parsed.data.deadline) : null;
        const res = await coordinatorRequestDocuments(ctx, parsed.data.instructions, deadlineDate);
        if (!res.success) return NextResponse.json({ error: res.error }, { status: res.statusCode || 400 });
        return NextResponse.json({ message: "Document request issued to student", grievance: res.grievance });
      }

      case "FORWARD_TO_HOD": {
        const parsed = forwardToHodSchema.safeParse({
          grievanceId,
          forwardingNotes: body.forwardingNotes,
        });
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        const res = await coordinatorForwardToHod(ctx, parsed.data.forwardingNotes);
        if (!res.success) return NextResponse.json({ error: res.error }, { status: res.statusCode || 400 });
        return NextResponse.json({ message: "Grievance escalated to Department Head", grievance: res.grievance });
      }

      case "RESOLVE": {
        const parsed = resolveGrievanceSchema.safeParse({
          grievanceId,
          resolutionSummary: body.resolutionSummary,
        });
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        const res = await coordinatorResolveGrievance(ctx, parsed.data.resolutionSummary);
        if (!res.success) return NextResponse.json({ error: res.error }, { status: res.statusCode || 400 });
        return NextResponse.json({ message: "Grievance resolved successfully", grievance: res.grievance });
      }

      default:
        return NextResponse.json(
          { error: `Unsupported workflow action '${action}'` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Coordinator action dispatch error:", error);
    return NextResponse.json({ error: "Failed to execute workflow action" }, { status: 500 });
  }
}
