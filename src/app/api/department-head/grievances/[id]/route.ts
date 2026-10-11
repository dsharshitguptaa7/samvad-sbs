import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { UserRole } from "@prisma/client";
import {
  verifyHodAccess,
  hodMarkUnderReview,
  hodAddInternalRemark,
  hodRequestDocuments,
  hodForwardToDirector,
  hodResolveGrievance,
  hodDismissGrievance,
} from "@/lib/escalation/workflow";
import {
  markUnderReviewSchema,
  addInternalRemarkSchema,
  createDocumentRequestSchema,
  forwardToDirectorSchema,
  resolveGrievanceSchema,
  dismissGrievanceSchema,
} from "@/lib/auth/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/department-head/grievances/[id]
 * Returns full grievance details, documents, student information, and timeline
 * ONLY if the grievance belongs to the HoD's assigned department.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole([UserRole.DEPARTMENT_HEAD]);
    const grievanceId = params.id;

    const access = await verifyHodAccess(user.id, grievanceId);
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
 * POST /api/department-head/grievances/[id]
 * Executes a validated workflow transition on the grievance by HoD.
 * Body: { action: "MARK_UNDER_REVIEW" | "ADD_INTERNAL_REMARK" | "REQUEST_DOCUMENTS" | "FORWARD_TO_DIRECTOR" | "RESOLVE" | "DISMISS", ...payload }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole([UserRole.DEPARTMENT_HEAD]);
    const grievanceId = params.id;
    const body = await req.json();

    const action = body.action;
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const ctx = {
      actorUserId: user.id,
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
        const res = await hodMarkUnderReview(ctx, parsed.data.remarks);
        if (!res.success) return NextResponse.json({ error: res.error }, { status: res.statusCode || 400 });
        return NextResponse.json({ message: "Grievance marked under review", grievance: res.grievance });
      }

      case "ADD_INTERNAL_REMARK": {
        const parsed = addInternalRemarkSchema.safeParse({ grievanceId, remarks: body.remarks });
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        const res = await hodAddInternalRemark(ctx, parsed.data.remarks);
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
        const deadlineDate = parsed.data.deadline ? new Date(parsed.data.deadline) : undefined;
        const res = await hodRequestDocuments(ctx, parsed.data.instructions, deadlineDate);
        if (!res.success) return NextResponse.json({ error: res.error }, { status: res.statusCode || 400 });
        return NextResponse.json({ message: "Clarification/documents requested from student", grievance: res.grievance });
      }

      case "FORWARD_TO_DIRECTOR": {
        const parsed = forwardToDirectorSchema.safeParse({
          grievanceId,
          forwardingNotes: body.forwardingNotes,
        });
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        const res = await hodForwardToDirector(ctx, parsed.data.forwardingNotes);
        if (!res.success) return NextResponse.json({ error: res.error }, { status: res.statusCode || 400 });
        return NextResponse.json({ message: "Grievance forwarded to School Director", grievance: res.grievance });
      }

      case "RESOLVE": {
        const parsed = resolveGrievanceSchema.safeParse({
          grievanceId,
          resolutionSummary: body.resolutionSummary,
        });
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        const res = await hodResolveGrievance(ctx, parsed.data.resolutionSummary);
        if (!res.success) return NextResponse.json({ error: res.error }, { status: res.statusCode || 400 });
        return NextResponse.json({ message: "Grievance resolved successfully", grievance: res.grievance });
      }

      case "DISMISS": {
        const parsed = dismissGrievanceSchema.safeParse({
          grievanceId,
          dismissalGrounds: body.grounds || body.dismissalGrounds,
          reasoning: body.reasoning,
        });
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        const res = await hodDismissGrievance(ctx, parsed.data.dismissalGrounds, parsed.data.reasoning);
        if (!res.success) return NextResponse.json({ error: res.error }, { status: res.statusCode || 400 });
        return NextResponse.json({ message: "Grievance dismissed with grounds recorded", grievance: res.grievance });
      }

      default:
        return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("HoD action dispatch error:", error);
    return NextResponse.json({ error: "Failed to execute action" }, { status: 500 });
  }
}
