import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { UserRole, WorkflowMode } from "@prisma/client";
import { z } from "zod";
import {
  getActiveWorkflowConfiguration,
  validateWorkflowReadiness,
  updateWorkflowConfiguration,
  getWorkflowAuditHistory,
} from "@/lib/workflow/configuration";

export const dynamic = "force-dynamic";

const updateWorkflowSchema = z.object({
  mode: z.nativeEnum(WorkflowMode, {
    message: "Mode must be either HOD_DIRECTOR or COORDINATOR_HOD_DIRECTOR.",
  }),
  reason: z
    .string()
    .min(5, "Change reason/justification must be at least 5 characters.")
    .max(500, "Reason cannot exceed 500 characters."),
  expectedVersion: z.number().int().positive().optional(),
});

/**
 * GET /api/admin/workflow
 * Returns:
 * - activeConfig: Current active workflow mode, version, last updated details
 * - readiness: Comprehensive readiness check for both supported modes
 * - auditLogs: Immutable history of workflow changes
 */
export async function GET() {
  try {
    await requireRole([UserRole.SYSTEM_ADMIN]);

    const activeConfig = await getActiveWorkflowConfiguration();
    const [hodReadiness, coordinatorReadiness, auditLogs] = await Promise.all([
      validateWorkflowReadiness(WorkflowMode.HOD_DIRECTOR),
      validateWorkflowReadiness(WorkflowMode.COORDINATOR_HOD_DIRECTOR),
      getWorkflowAuditHistory(30),
    ]);

    return NextResponse.json({
      activeConfig,
      readiness: {
        HOD_DIRECTOR: hodReadiness,
        COORDINATOR_HOD_DIRECTOR: coordinatorReadiness,
      },
      auditLogs,
    });
  } catch (err: any) {
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("GET /api/admin/workflow error:", err);
    return NextResponse.json(
      { error: "Internal server error fetching workflow settings." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/workflow
 * Updates the active workflow mode with optimistic concurrency control,
 * pre-flight authority readiness validation, and audit logging.
 */
export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireRole([UserRole.SYSTEM_ADMIN]);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const parsed = updateWorkflowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await updateWorkflowConfiguration(adminUser.id, {
      mode: parsed.data.mode,
      reason: parsed.data.reason,
      expectedVersion: parsed.data.expectedVersion,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          issues: result.issues,
        },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      message: `Workflow successfully updated to ${parsed.data.mode}.`,
      configuration: result.configuration,
    });
  } catch (err: any) {
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("POST /api/admin/workflow error:", err);
    return NextResponse.json(
      { error: "Internal server error updating workflow settings." },
      { status: 500 }
    );
  }
}
