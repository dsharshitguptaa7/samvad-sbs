import { z } from "zod";
import { UserRole } from "@prisma/client";

export const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(100, "Password cannot exceed 100 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(
    /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
    "Password must contain at least one number or special character"
  );

/**
 * Student Registration Input Schema
 * Notice: This schema strictly omits any `role` or admin fields.
 * Even if an attacker passes `{ role: "SYSTEM_ADMIN" }`, it is ignored.
 */
export const studentRegistrationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters")
    .regex(/^[a-zA-Z\s.'-]+$/, "Full name contains invalid characters"),
  rollNumber: z
    .string()
    .trim()
    .min(4, "Roll number must be at least 4 characters")
    .max(30, "Roll number cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Roll number must be alphanumeric"),
  enrollmentNo: z
    .string()
    .trim()
    .min(4, "Enrollment number must be at least 4 characters")
    .max(30, "Enrollment number cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Enrollment number must be alphanumeric"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  departmentCode: z.enum(["MATH", "PHYS", "CHEM", "GEOG", "ENVS"]),
  courseName: z.string().trim().min(2, "Course name is required"),
  semester: z.string().trim().min(1, "Semester is required"),
  password: strongPasswordSchema,
});

export type StudentRegistrationInput = z.infer<typeof studentRegistrationSchema>;

/**
 * Unified Login Input Schema
 */
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Identifier must be at least 3 characters")
    .max(100, "Identifier is too long"),
  password: z.string().min(1, "Password is required"),
  portalType: z.enum(["student", "staff"]).optional().default("student"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Staff Onboarding Schema (Strictly for System Admin)
 */
export const staffOnboardingSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum([
    UserRole.COURSE_COORDINATOR,
    UserRole.DEPARTMENT_HEAD,
    UserRole.DIRECTOR,
  ]),
  phoneNumber: z.string().trim().optional(),
  departmentId: z.string().uuid("Invalid department ID"),
  courseId: z.string().uuid("Invalid course ID").optional().nullable(),
  initialPassword: strongPasswordSchema,
});

export type StaffOnboardingInput = z.infer<typeof staffOnboardingSchema>;
