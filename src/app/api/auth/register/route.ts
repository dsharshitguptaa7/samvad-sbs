import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { studentRegistrationSchema } from "@/lib/auth/validation";
import { hashPassword } from "@/lib/auth/password";
import { createSession, sanitizeUser } from "@/lib/auth/session";
import { UserRole } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validate Input (Strict Zod validation)
    // Note: studentRegistrationSchema ignores any privileged role properties
    const validationResult = studentRegistrationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed. Please verify your submitted fields.",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      fullName,
      rollNumber,
      enrollmentNo,
      email,
      phoneNumber,
      departmentCode,
      courseName,
      password,
    } = validationResult.data;

    // 2. Check for unique conflicts
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email address already exists.",
        },
        { status: 409 }
      );
    }

    const existingRoll = await prisma.user.findUnique({
      where: { rollNumber },
    });
    if (existingRoll) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this CSJMU Roll Number already exists.",
        },
        { status: 409 }
      );
    }

    const existingEnrollment = await prisma.user.findUnique({
      where: { enrollmentNo },
    });
    if (existingEnrollment) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this Enrollment Number already exists.",
        },
        { status: 409 }
      );
    }

    // 2.5 Verify active Department and Course in database
    const dept = await prisma.department.findUnique({
      where: { code: departmentCode.toUpperCase() },
    });
    if (!dept || !dept.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Selected department is not currently active.",
        },
        { status: 400 }
      );
    }

    const course = await prisma.course.findFirst({
      where: {
        departmentId: dept.id,
        name: { equals: courseName, mode: "insensitive" },
        isActive: true,
      },
    });
    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: "Selected course does not exist or is not active in this department.",
        },
        { status: 400 }
      );
    }

    // 3. Hash Password (bcryptjs, 12 rounds)
    const passwordHash = await hashPassword(password);

    // 4. Create User Record
    // Privilege Safeguard: Role is strictly locked to UserRole.STUDENT on the server
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: UserRole.STUDENT,
        phoneNumber,
        rollNumber,
        enrollmentNo,
        isActive: true,
        mustResetPassword: false,
      },
    });

    // 5. Create Session & Set Secure HTTP-only Cookie
    await createSession(newUser.id);

    // 6. Return Sanitized User (Never leaks passwordHash or session token)
    return NextResponse.json(
      {
        success: true,
        message: "Student account registered successfully.",
        user: sanitizeUser(newUser),
      },
      { status: 201 }
    );
  } catch (error: any) {
    // Gracefully handle Prisma unique constraint violation (P2002) in race conditions
    if (error?.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(", ")
        : (typeof error.meta?.target === "string" ? error.meta.target : "email, roll number, or enrollment number");
      return NextResponse.json(
        {
          success: false,
          error: `An account with this ${target} already exists.`,
          code: "DUPLICATE_RESOURCE",
        },
        { status: 409 }
      );
    }

    console.error("Student registration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to complete registration. Please try again later.",
      },
      { status: 500 }
    );
  }
}
