import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth/guard";
import { resolveAuthorityChain, validateSchoolAuthorityMatrix } from "@/lib/routing/authority-chain";

/**
 * GET /api/admin/routing
 * Inspect authority chain resolutions:
 * - If ?courseId=UUID is passed: returns detailed resolution for that specific course.
 * - Otherwise: returns school-wide authority matrix report.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole([UserRole.SYSTEM_ADMIN]);

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (courseId) {
      const semesterStr = searchParams.get("semester");
      const semester = semesterStr ? parseInt(semesterStr, 10) : undefined;
      const resolution = await resolveAuthorityChain(courseId, semester);
      return NextResponse.json({
        success: true,
        resolution,
      });
    }

    const matrixReport = await validateSchoolAuthorityMatrix();
    return NextResponse.json({
      success: true,
      matrix: matrixReport,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/routing error:", error);
    return NextResponse.json({ success: false, error: "Failed to evaluate authority routing matrix." }, { status: 500 });
  }
}
