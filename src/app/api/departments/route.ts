import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public Academic Master Data Endpoint
 * Returns only active departments and their active course programs.
 * Strips all internal metadata, user identities, and credentials.
 */
export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        courses: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            programType: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      {
        success: true,
        departments,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Public departments query error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to load academic master data.",
      },
      { status: 500 }
    );
  }
}
