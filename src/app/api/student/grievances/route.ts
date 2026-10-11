import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { UserRole } from "@prisma/client";
import { submitGrievanceSchema } from "@/lib/auth/validation";
import { createStudentGrievance } from "@/lib/grievance/submission";
import { storageProvider, StoredFileMetadata } from "@/lib/storage/provider";

export const dynamic = "force-dynamic";

/**
 * POST /api/student/grievances
 * Accepts multipart/form-data for grievance submission with optional file uploads.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole([UserRole.STUDENT]);

    const formData = await req.formData();
    const courseId = formData.get("courseId")?.toString() || "";
    const semesterRaw = formData.get("semester");
    const semester = semesterRaw ? parseInt(semesterRaw.toString(), 10) : undefined;
    const category = formData.get("category")?.toString() || "";
    const subject = formData.get("subject")?.toString() || "";
    const description = formData.get("description")?.toString() || "";
    const reliefSought = formData.get("reliefSought")?.toString() || "";
    const declarationConfirmed = formData.get("declarationConfirmed") === "true";

    // 1. Validate payload
    const parsed = submitGrievanceSchema.safeParse({
      courseId,
      semester,
      category,
      subject,
      description,
      reliefSought: reliefSought || undefined,
      declarationConfirmed,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // 2. Handle uploaded files (if any)
    const files = formData.getAll("files") as File[];
    const savedFiles: StoredFileMetadata[] = [];

    try {
      for (const file of files) {
        if (!file || typeof file === "string" || file.size === 0) continue;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const saved = await storageProvider.saveFile(buffer, file.name, file.type);
        savedFiles.push(saved);
      }
    } catch (uploadError: any) {
      // Clean up already saved files in this request if any file failed validation
      for (const saved of savedFiles) {
        await storageProvider.deleteFile(saved.storageKey);
      }

      return NextResponse.json(
        {
          error: uploadError.message || "Failed to process uploaded file.",
        },
        { status: 400 }
      );
    }

    // 3. Extract IP and User-Agent
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    // 4. Create Grievance
    const result = await createStudentGrievance({
      studentId: user.id,
      courseId: parsed.data.courseId,
      semester: parsed.data.semester,
      category: parsed.data.category,
      subject: parsed.data.subject,
      description: parsed.data.description,
      reliefSought: parsed.data.reliefSought,
      uploadedFiles: savedFiles,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      // If transaction failed, delete uploaded files from storage to prevent orphans
      for (const saved of savedFiles) {
        await storageProvider.deleteFile(saved.storageKey);
      }

      const statusCode =
        result.errorCode === "UNRESOLVED_ROUTING"
          ? 422
          : result.errorCode === "INVALID_COURSE"
          ? 400
          : 500;

      return NextResponse.json(
        {
          error: result.error,
          code: result.errorCode,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        message: "Grievance submitted successfully.",
        grievanceId: result.grievance!.id,
        trackingNumber: result.trackingNumber,
        trackingToken: result.trackingToken,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Grievance submission endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred while lodging grievance." },
      { status: 500 }
    );
  }
}
