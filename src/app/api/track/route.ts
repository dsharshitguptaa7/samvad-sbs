import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/track?trackingNumber=CSJMU-SBS-2026-MATH-0142
 * Public grievance status lookup.
 *
 * Privacy & Security Guarantees:
 * - Rate-limited by IP to prevent enumeration (max 10 requests / 15 minutes).
 * - NEVER leaks:
 *   - Student identity (name, email, roll number, phone number).
 *   - Grievance description or relief sought.
 *   - Uploaded evidentiary documents.
 *   - Internal staff remarks.
 * - Only returns high-level milestones:
 *   - Tracking number
 *   - Department code & name
 *   - Course code & name
 *   - Category
 *   - Submission date
 *   - Current status
 *   - Current review tier
 *   - Public milestone history (actionType, timestamp, fromTier, toTier)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const trackingNumber = searchParams.get("trackingNumber")?.trim();

    if (!trackingNumber) {
      return NextResponse.json(
        { error: "Tracking number is required" },
        { status: 400 }
      );
    }

    // Rate limiting by client IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rateLimit = checkRateLimit(`track:${ip}`, 10, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many tracking lookups. Please try again later.",
          retryAfter: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const grievance = await prisma.grievance.findUnique({
      where: { trackingNumber },
      select: {
        trackingNumber: true,
        category: true,
        currentStatus: true,
        currentTier: true,
        createdAt: true,
        resolvedAt: true,
        department: {
          select: {
            name: true,
            code: true,
          },
        },
        course: {
          select: {
            name: true,
            code: true,
          },
        },
        timelineActions: {
          where: { visibility: "PUBLIC_TO_STUDENT" },
          select: {
            actionType: true,
            fromTier: true,
            toTier: true,
            fromStatus: true,
            toStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!grievance) {
      return NextResponse.json(
        {
          error: "No grievance record found matching the specified tracking number. Please verify your tracking ID.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      trackingRecord: {
        trackingNumber: grievance.trackingNumber,
        category: grievance.category,
        currentStatus: grievance.currentStatus,
        currentTier: grievance.currentTier,
        submittedAt: grievance.createdAt,
        resolvedAt: grievance.resolvedAt,
        departmentName: grievance.department.name,
        departmentCode: grievance.department.code,
        courseName: grievance.course.name,
        courseCode: grievance.course.code,
        milestones: grievance.timelineActions.map((action) => ({
          actionType: action.actionType,
          fromTier: action.fromTier,
          toTier: action.toTier,
          fromStatus: action.fromStatus,
          toStatus: action.toStatus,
          timestamp: action.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Public tracking error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while looking up tracking status." },
      { status: 500 }
    );
  }
}
