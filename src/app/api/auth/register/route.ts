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
