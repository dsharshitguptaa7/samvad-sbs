import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/guard";
import { UserRole } from "@prisma/client";
import { storageProvider } from "@/lib/storage/provider";

export const dynamic = "force-dynamic";

/**
 * GET /api/documents/[id]
 * Securely streams an evidentiary file to an authorized user.
 * Access rules:
 * - STUDENT: Allowed ONLY if document belongs to a grievance where studentId === currentUser.id.
 * - STAFF (COORDINATOR, HOD, DIRECTOR): Allowed if grievance falls in their institutional jurisdiction.
 * - SYSTEM_ADMIN: Explicitly forbidden (separation of powers).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fastApiUrl = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_API_URL;
    if (fastApiUrl) {
      const forwardHeaders = new Headers();
      const cookie = req.headers.get("cookie");
      if (cookie) forwardHeaders.set("cookie", cookie);
      const auth = req.headers.get("authorization");
      if (auth) forwardHeaders.set("authorization", auth);

      const res = await fetch(`${fastApiUrl}/api/documents/${params.id}`, {
        method: "GET",
        headers: forwardHeaders,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Document fetch failed" }));
        return NextResponse.json(errorData, { status: res.status });
      }

      const responseHeaders = new Headers();
      ["content-type", "content-length", "content-disposition", "cache-control", "x-content-type-options"].forEach(
        (h) => {
          const val = res.headers.get(h);
          if (val) responseHeaders.set(h, val);
        }
      );

      return new NextResponse(res.body, {
        status: res.status,
        headers: responseHeaders,
      });
    }

    const user = await requireAuth();
    const documentId = params.id;

    const doc = await prisma.grievanceDocument.findUnique({
      where: { id: documentId },
      include: {
        grievance: {
          select: {
            id: true,
            studentId: true,
            departmentId: true,
            courseId: true,
          },
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Role-based authorization & tenancy check
    if (user.role === UserRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "Access denied. Administrators cannot inspect grievance evidence files." },
        { status: 403 }
      );
    }

    if (user.role === UserRole.STUDENT) {
      if (doc.grievance.studentId !== user.id) {
        return NextResponse.json(
          { error: "Access denied. You do not own this document." },
          { status: 403 }
        );
      }
    } else if (
      user.role === UserRole.COURSE_COORDINATOR ||
      user.role === UserRole.DEPARTMENT_HEAD ||
      user.role === UserRole.DIRECTOR
    ) {
      // In Phase 3, verify staff is active; full multi-tier filtering applies
      if (!user.isActive) {
        return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Retrieve file from private storage
    const fileData = await storageProvider.getFile(doc.storageKey);
    if (!fileData) {
      return NextResponse.json(
        { error: "File not found in storage repository" },
        { status: 404 }
      );
    }

    // Stream response with secure headers
    return new NextResponse(new Uint8Array(fileData.buffer), {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType || fileData.mimeType,
        "Content-Length": doc.fileSize.toString(),
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Document retrieval error:", error);
    return NextResponse.json({ error: "Failed to retrieve document" }, { status: 500 });
  }
}
