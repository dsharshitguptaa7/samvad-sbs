import { z } from "zod";
import { UserRole, GrievanceCategory } from "@prisma/client";

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
  departmentCode: z
    .string()
    .trim()
    .min(2, "Department code must be at least 2 characters")
    .max(20)
    .toUpperCase(),
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
  redirect: z.string().optional(),
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

/**
 * Department Creation Schema
 */
export const createDepartmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Department name must be at least 3 characters")
    .max(150, "Department name cannot exceed 150 characters"),
  code: z
    .string()
    .trim()
    .min(2, "Department code must be at least 2 characters")
    .max(20, "Department code cannot exceed 20 characters")
    .regex(/^[A-Z0-9_-]+$/i, "Department code must contain only letters, numbers, hyphens, or underscores")
    .transform((val) => val.toUpperCase()),
  description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

/**
 * Department Update Schema
 */
export const updateDepartmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Department name must be at least 3 characters")
    .max(150, "Department name cannot exceed 150 characters")
    .optional(),
  code: z
    .string()
    .trim()
    .min(2, "Department code must be at least 2 characters")
    .max(20, "Department code cannot exceed 20 characters")
    .regex(/^[A-Z0-9_-]+$/i, "Department code must contain only letters, numbers, hyphens, or underscores")
    .transform((val) => val.toUpperCase())
    .optional(),
  description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

/**
 * Course Creation Schema
 */
export const createCourseSchema = z.object({
  departmentId: z.string().uuid("Invalid department ID"),
  name: z
    .string()
    .trim()
    .min(2, "Course name must be at least 2 characters")
    .max(150, "Course name cannot exceed 150 characters"),
  code: z
    .string()
    .trim()
    .min(2, "Course code must be at least 2 characters")
    .max(30, "Course code cannot exceed 30 characters")
    .regex(/^[A-Z0-9_-]+$/i, "Course code must contain only letters, numbers, hyphens, or underscores")
    .transform((val) => val.toUpperCase()),
  programType: z.string().trim().max(50, "Program type cannot exceed 50 characters").optional().nullable(),
  totalSemesters: z.coerce.number().int().min(1, "Course must have at least 1 semester").max(12, "Semesters cannot exceed 12").optional().default(6),
  academicPeriod: z.enum(["ODD", "EVEN", "ALL"]).optional().default("ALL"),
  isActive: z.boolean().optional().default(true),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

/**
 * Course Update Schema
 */
export const updateCourseSchema = z.object({
  departmentId: z.string().uuid("Invalid department ID").optional(),
  name: z
    .string()
    .trim()
    .min(2, "Course name must be at least 2 characters")
    .max(150, "Course name cannot exceed 150 characters")
    .optional(),
  code: z
    .string()
    .trim()
    .min(2, "Course code must be at least 2 characters")
    .max(30, "Course code cannot exceed 30 characters")
    .regex(/^[A-Z0-9_-]+$/i, "Course code must contain only letters, numbers, hyphens, or underscores")
    .transform((val) => val.toUpperCase())
    .optional(),
  programType: z.string().trim().max(50, "Program type cannot exceed 50 characters").optional().nullable(),
  totalSemesters: z.coerce.number().int().min(1).max(12).optional(),
  academicPeriod: z.enum(["ODD", "EVEN", "ALL"]).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

/**
 * Optional Phone Number Schema
 * Accepts null, undefined, empty string, or valid phone number format.
 * Normalizes empty strings and undefined to null.
 */
export const optionalPhoneNumberSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) => (val === "" || val === undefined ? null : val))
  .refine((val) => val === null || /^[0-9+() -]{7,20}$/.test(val), {
    message: "Invalid phone number format. Must be between 7 and 20 digits if provided.",
  });

/**
 * Staff Account Provisioning Schema
 * Only allows COURSE_COORDINATOR, DEPARTMENT_HEAD, DIRECTOR.
 * Explicitly rejects STUDENT and SYSTEM_ADMIN roles.
 */
export const provisionStaffSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid institutional email address"),
  role: z.enum(
    [UserRole.COURSE_COORDINATOR, UserRole.DEPARTMENT_HEAD, UserRole.DIRECTOR],
    { message: "Role must be COURSE_COORDINATOR, DEPARTMENT_HEAD, or DIRECTOR" }
  ),
  phoneNumber: optionalPhoneNumberSchema,
});

export type ProvisionStaffInput = z.infer<typeof provisionStaffSchema>;

/**
 * Staff Profile Update Schema
 */
export const updateStaffProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters")
    .max(100, "Full name cannot exceed 100 characters")
    .optional(),
  phoneNumber: optionalPhoneNumberSchema,
  isActive: z.boolean().optional(),
});

export type UpdateStaffProfileInput = z.infer<typeof updateStaffProfileSchema>;

/**
 * Authority Assignment Creation Schema
 */
export const createAssignmentSchema = z.object({
  userId: z.string().uuid("Invalid staff user ID"),
  role: z.enum([UserRole.COURSE_COORDINATOR, UserRole.DEPARTMENT_HEAD, UserRole.DIRECTOR]),
  departmentId: z.string().uuid("Invalid department ID"),
  courseId: z.string().uuid("Invalid course ID").optional().nullable(),
  semesters: z.array(z.coerce.number().int().min(1).max(12)).optional().default([]),
  academicPeriod: z.enum(["ODD", "EVEN", "ALL"]).optional().nullable(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

/**
 * Password Reset / Setup Schema
 */
export const resetPasswordSubmitSchema = z.object({
  token: z.string().min(32, "Invalid setup token"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string().min(8, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type ResetPasswordSubmitInput = z.infer<typeof resetPasswordSubmitSchema>;

/**
 * Student Grievance Submission Schema
 */
export const submitGrievanceSchema = z.object({
  courseId: z.string().uuid("Please select a valid course"),
  semester: z.coerce.number().int().min(1, "Semester must be at least 1").max(12, "Semester cannot exceed 12").optional().default(1),
  category: z.nativeEnum(GrievanceCategory, {
    message: "Please select a valid grievance category",
  }),
  subject: z
    .string()
    .trim()
    .min(5, "Subject must be at least 5 characters")
    .max(150, "Subject cannot exceed 150 characters"),
  description: z
    .string()
    .trim()
    .min(20, "Detailed description must be at least 20 characters")
    .max(5000, "Description cannot exceed 5000 characters"),
  reliefSought: z
    .string()
    .trim()
    .max(500, "Relief sought cannot exceed 500 characters")
    .optional()
    .nullable(),
  declarationConfirmed: z.literal(true, {
    message: "You must confirm the truthfulness declaration before submitting",
  }),
});

export type SubmitGrievanceInput = z.infer<typeof submitGrievanceSchema>;

/**
 * Student Response to Document Request Schema
 */
export const fulfillDocumentRequestSchema = z.object({
  requestId: z.string().uuid("Invalid document request ID"),
  remarks: z.string().trim().max(1000).optional(),
});

export type FulfillDocumentRequestInput = z.infer<typeof fulfillDocumentRequestSchema>;

/**
 * Coordinator Workflow Action Schemas
 */
export const markUnderReviewSchema = z.object({
  grievanceId: z.string().uuid("Invalid grievance ID"),
  remarks: z.string().trim().max(1000).optional(),
});

export const addInternalRemarkSchema = z.object({
  grievanceId: z.string().uuid("Invalid grievance ID"),
  remarks: z.string().trim().min(3, "Remarks must be at least 3 characters").max(2000),
});

export const createDocumentRequestSchema = z.object({
  grievanceId: z.string().uuid("Invalid grievance ID"),
  instructions: z
    .string()
    .trim()
    .min(10, "Instructions must be at least 10 characters")
    .max(2000, "Instructions cannot exceed 2000 characters"),
  deadline: z.string().datetime().optional().nullable(),
});

export const forwardToHodSchema = z.object({
  grievanceId: z.string().uuid("Invalid grievance ID"),
  forwardingNotes: z
    .string()
    .trim()
    .min(10, "Forwarding notes must be at least 10 characters")
    .max(2000, "Forwarding notes cannot exceed 2000 characters"),
});

export const resolveGrievanceSchema = z.object({
  grievanceId: z.string().uuid("Invalid grievance ID"),
  resolutionSummary: z
    .string()
    .trim()
    .min(15, "Resolution summary must be at least 15 characters")
    .max(3000, "Resolution summary cannot exceed 3000 characters"),
});

export const forwardToDirectorSchema = z.object({
  grievanceId: z.string().uuid("Invalid grievance ID"),
  forwardingNotes: z
    .string()
    .trim()
    .min(10, "Forwarding notes must be at least 10 characters")
    .max(2000, "Forwarding notes cannot exceed 2000 characters"),
});

export const dismissGrievanceSchema = z.object({
  grievanceId: z.string().uuid("Invalid grievance ID"),
  dismissalGrounds: z.enum([
    "OUT_OF_JURISDICTION",
    "INSUFFICIENT_EVIDENCE",
    "DUPLICATE_SUBMISSION",
    "OTHER",
  ], {
    message: "Valid dismissal grounds are required",
  }),
  reasoning: z
    .string()
    .trim()
    .min(15, "Reasoning explanation must be at least 15 characters")
    .max(3000, "Reasoning explanation cannot exceed 3000 characters"),
});

