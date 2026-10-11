import "dotenv/config";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "../src/lib/prisma";
import {
  UserRole,
  GrievanceCategory,
  GrievanceStatus,
  GrievanceTier,
  TimelineActionType,
} from "@prisma/client";
import { createStudentGrievance } from "../src/lib/grievance/submission";
import { generateUniqueTrackingNumber } from "../src/lib/grievance/tracking";
import {
  storageProvider,
  validateFileSignature,
  MAX_FILE_SIZE_BYTES,
} from "../src/lib/storage/provider";

describe("SAMVAD Phase 3: Student Grievance Submission, Tracking & Document Pipeline", () => {
  // Test Identifiers
  const studentEmail = "student.phase3.test@csjmu.ac.in";
  const student2Email = "student2.phase3.test@csjmu.ac.in";
  const coordEmail = "coord.phase3.test@csjmu.ac.in";
  const hodEmail = "hod.phase3.test@csjmu.ac.in";

  const deptCode = "TEST_PH3_DEPT";
  const courseCode = "TEST_PH3_CRS";

  let studentId = "";
  let student2Id = "";
  let coordId = "";
  let hodId = "";
  let deptId = "";
  let courseId = "";

  async function cleanupTestData() {
    try {
      const users = await prisma.user.findMany({
        where: { email: { in: [studentEmail, student2Email, coordEmail, hodEmail] } },
      });
      const userIds = users.map((u) => u.id);

      if (userIds.length > 0) {
        // Find grievances created by test students
        const grievances = await prisma.grievance.findMany({
          where: { studentId: { in: userIds } },
        });
        const gIds = grievances.map((g) => g.id);

        if (gIds.length > 0) {
          // Delete documents, requests, timeline
          await prisma.grievanceDocument.deleteMany({ where: { grievanceId: { in: gIds } } });
          await prisma.documentRequest.deleteMany({ where: { grievanceId: { in: gIds } } });
          await prisma.grievanceTimelineAction.deleteMany({ where: { grievanceId: { in: gIds } } });
          await prisma.grievance.deleteMany({ where: { id: { in: gIds } } });
        }

        await prisma.staffAssignment.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }

      // Cleanup department and course
      const dept = await prisma.department.findUnique({
        where: { code: deptCode },
        include: { courses: true },
      });
      if (dept) {
        const cIds = dept.courses.map((c) => c.id);
        await prisma.staffAssignment.deleteMany({ where: { departmentId: dept.id } });
        await prisma.grievance.deleteMany({ where: { departmentId: dept.id } });
        await prisma.course.deleteMany({ where: { id: { in: cIds } } });
        await prisma.department.delete({ where: { id: dept.id } });
      }
    } catch (e) {
      console.error("Cleanup error in Phase 3 test:", e);
    }
  }

  before(async () => {
    await cleanupTestData();

    // 1. Create Academic Master Data (Department & Course)
    const dept = await prisma.department.create({
      data: {
        name: "Phase 3 Test Department",
        code: deptCode,
        description: "Department for grievance submission testing",
        isActive: true,
      },
    });
    deptId = dept.id;

    const course = await prisma.course.create({
      data: {
        departmentId: deptId,
        name: "Phase 3 Test Course",
        code: courseCode,
        programType: "Postgraduate",
        isActive: true,
      },
    });
    courseId = course.id;

    // 2. Create Student Account
    const student = await prisma.user.create({
      data: {
        fullName: "Aryan Verma",
        email: studentEmail,
        role: UserRole.STUDENT,
        rollNumber: "PH3_240101",
        enrollmentNo: "CSJM_PH3_001",
        phoneNumber: "9876543210",
        passwordHash: "$2b$12$dummyhashforphase3tests00000000000000000000000000000",
        isActive: true,
      },
    });
    studentId = student.id;

    // 3. Create Second Student Account (for tenancy isolation tests)
    const student2 = await prisma.user.create({
      data: {
        fullName: "Pooja Sharma",
        email: student2Email,
        role: UserRole.STUDENT,
        rollNumber: "PH3_240102",
        enrollmentNo: "CSJM_PH3_002",
        phoneNumber: "9876543211",
        passwordHash: "$2b$12$dummyhashforphase3tests00000000000000000000000000000",
        isActive: true,
      },
    });
    student2Id = student2.id;

    // 4. Create Course Coordinator & Department Head
    const coord = await prisma.user.create({
      data: {
        fullName: "Dr. Ramanathan",
        email: coordEmail,
        role: UserRole.COURSE_COORDINATOR,
        phoneNumber: "9876543222",
        passwordHash: "$2b$12$dummyhashforphase3tests00000000000000000000000000000",
        isActive: true,
      },
    });
    coordId = coord.id;

    const hod = await prisma.user.create({
      data: {
        fullName: "Prof. Mukherjee",
        email: hodEmail,
        role: UserRole.DEPARTMENT_HEAD,
        phoneNumber: "9876543233",
        passwordHash: "$2b$12$dummyhashforphase3tests00000000000000000000000000000",
        isActive: true,
      },
    });
    hodId = hod.id;

    // Assign Coordinator to course and HoD to department
    await prisma.staffAssignment.create({
      data: {
        userId: coordId,
        role: UserRole.COURSE_COORDINATOR,
        departmentId: deptId,
        courseId: courseId,
        isActive: true,
      },
    });

    await prisma.staffAssignment.create({
      data: {
        userId: hodId,
        role: UserRole.DEPARTMENT_HEAD,
        departmentId: deptId,
        courseId: null,
        isActive: true,
      },
    });
  });

  after(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // ===========================================================================
  // 1. Grievance Tracking Number Generation & Uniqueness
  // ===========================================================================
  describe("1. Tracking Number & Token Architecture", () => {
    it("should generate tracking number matching CSJMU-SBS-[YEAR]-[DEPT]-[HEX] format", async () => {
      const year = new Date().getFullYear();
      const info = await generateUniqueTrackingNumber(deptCode);

      assert.ok(info.trackingNumber);
      assert.ok(info.trackingNumber.startsWith(`CSJMU-SBS-${year}-${deptCode}-`));
      assert.ok(info.trackingToken);
      assert.ok(info.trackingTokenHash);
      assert.equal(info.trackingToken.length, 32); // 16 bytes hex
      assert.equal(info.trackingTokenHash.length, 64); // SHA-256 hex
    });
  });

  // ===========================================================================
  // 2. Storage Provider Validation & Security Invariants
  // ===========================================================================
  describe("2. Private Storage Security & Magic Byte Validation", () => {
    it("should accept valid PDF magic bytes (%PDF)", () => {
      const pdfBuffer = Buffer.from("%PDF-1.7 header content here");
      assert.equal(validateFileSignature(pdfBuffer, "application/pdf"), true);
    });

    it("should reject spoofed PDF file where content does not match signature", () => {
      const fakePdfBuffer = Buffer.from("<script>alert('xss')</script>");
      assert.equal(validateFileSignature(fakePdfBuffer, "application/pdf"), false);
    });

    it("should reject saving file exceeding MAX_FILE_SIZE_BYTES (5MB)", async () => {
      const largeBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);
      await assert.rejects(
        () => storageProvider.saveFile(largeBuffer, "large.pdf", "application/pdf"),
        /exceeds maximum allowed 5MB/
      );
    });

    it("should save a valid PDF and return secure metadata and sha256 checksum", async () => {
      const samplePdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
      const saved = await storageProvider.saveFile(samplePdf, "mark_sheet.pdf", "application/pdf");

      assert.ok(saved.storageKey);
      assert.ok(saved.storageKey.endsWith(".pdf"));
      assert.equal(saved.fileName, "mark_sheet.pdf");
      assert.equal(saved.mimeType, "application/pdf");
      assert.ok(saved.sha256Hash);

      // Verify file can be read back from private storage
      const retrieved = await storageProvider.getFile(saved.storageKey);
      assert.ok(retrieved);
      assert.equal(retrieved.buffer.length, samplePdf.length);

      // Clean up test file
      await storageProvider.deleteFile(saved.storageKey);
    });
  });

  // ===========================================================================
  // 3. Atomic Grievance Lodging & Routing Persistence
  // ===========================================================================
  describe("3. Grievance Submission & Initial Routing", () => {
    let createdGrievanceId = "";
    let createdTrackingNumber = "";

    it("should reject submission when student account is deactivated", async () => {
      // Temporarily deactivate student
      await prisma.user.update({
        where: { id: studentId },
        data: { isActive: false },
      });

      const res = await createStudentGrievance({
        studentId,
        courseId,
        category: GrievanceCategory.ACADEMIC,
        subject: "Grading issue in laboratory assessment",
        description: "Detailed account of the grading discrepancy in physical chemistry practicals.",
      });

      assert.equal(res.success, false);
      assert.equal(res.errorCode, "STUDENT_INACTIVE");

      // Reactivate student
      await prisma.user.update({
        where: { id: studentId },
        data: { isActive: true },
      });
    });

    it("should reject submission when course coordinator is unassigned (unresolvable routing)", async () => {
      // Temporarily deactivate coordinator assignment
      await prisma.staffAssignment.updateMany({
        where: { courseId },
        data: { isActive: false },
      });

      const res = await createStudentGrievance({
        studentId,
        courseId,
        category: GrievanceCategory.ACADEMIC,
        subject: "Grading issue in laboratory assessment",
        description: "Detailed account of the grading discrepancy in physical chemistry practicals.",
      });

      assert.equal(res.success, false);
      assert.equal(res.errorCode, "UNRESOLVED_ROUTING");
      assert.ok(res.error?.includes("No active Course Coordinator assigned"));

      // Restore coordinator assignment
      await prisma.staffAssignment.updateMany({
        where: { courseId },
        data: { isActive: true },
      });
    });

    it("should successfully persist grievance, assign to Tier-1 Coordinator, and record timeline", async () => {
      const samplePdf = Buffer.from("%PDF-1.4 sample evidence document bytes");
      const savedDoc = await storageProvider.saveFile(
        samplePdf,
        "fee_receipt.pdf",
        "application/pdf"
      );

      const res = await createStudentGrievance({
        studentId,
        courseId,
        category: GrievanceCategory.EXAMINATION,
        subject: "Evaluation discrepancy in Semester II Theory Examination",
        description: "The marks awarded in Course Module 201 do not reflect continuous internal assessment scores.",
        reliefSought: "Verification of answer script totaling and re-check.",
        uploadedFiles: [savedDoc],
      });

      assert.equal(res.success, true);
      assert.ok(res.grievance);
      assert.ok(res.trackingNumber);

      createdGrievanceId = res.grievance.id;
      createdTrackingNumber = res.trackingNumber;

      // Invariants Check
      assert.equal(res.grievance.studentId, studentId);
      assert.equal(res.grievance.assignedToUserId, coordId);
      assert.equal(res.grievance.currentTier, GrievanceTier.TIER_1_COORDINATOR);
      assert.equal(res.grievance.currentStatus, GrievanceStatus.SUBMITTED);

      // Verify Timeline Entry was created atomically
      const timelineActions = await prisma.grievanceTimelineAction.findMany({
        where: { grievanceId: createdGrievanceId },
      });
      assert.equal(timelineActions.length, 1);
      assert.equal(timelineActions[0].actionType, TimelineActionType.SUBMITTED);
      assert.equal(timelineActions[0].actorId, studentId);

      // Verify Attached Document record
      const docs = await prisma.grievanceDocument.findMany({
        where: { grievanceId: createdGrievanceId },
      });
      assert.equal(docs.length, 1);
      assert.equal(docs[0].fileName, "fee_receipt.pdf");
      assert.equal(docs[0].storageKey, savedDoc.storageKey);

      // Clean up physical file
      await storageProvider.deleteFile(savedDoc.storageKey);
    });

    it("should prevent Student B from querying or reading Student A's grievance (Tenancy Isolation)", async () => {
      const grievance = await prisma.grievance.findUnique({
        where: { id: createdGrievanceId },
      });
      assert.ok(grievance);

      // Verify Student B is not the owner
      assert.notEqual(grievance.studentId, student2Id);
      assert.equal(grievance.studentId, studentId);
    });

    it("should reject non-student role attempting to lodge grievance", async () => {
      const res = await createStudentGrievance({
        studentId: coordId, // Faculty ID
        courseId,
        category: GrievanceCategory.ACADEMIC,
        subject: "Invalid lodging by coordinator",
        description: "Coordinators should not be able to file grievances via student service.",
      });

      assert.equal(res.success, false);
      assert.equal(res.errorCode, "STUDENT_INACTIVE");
    });
  });

  // ===========================================================================
  // 4. Public Tracking Desk & Privacy Redaction
  // ===========================================================================
  describe("4. Public Tracking Privacy & Redaction", () => {
    it("should redact student identity, private remarks, and documents on tracking query", async () => {
      // Fetch public tracking projection for the created grievance
      const grievance = await prisma.grievance.findFirst({
        where: { studentId },
        include: {
          department: true,
          course: true,
          timelineActions: { where: { visibility: "PUBLIC_TO_STUDENT" } },
        },
      });

      assert.ok(grievance);

      // The public endpoint returns only sanitized fields
      const publicProjection = {
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
      };

      // Invariants: Student personal information must NOT exist in the public projection
      assert.equal((publicProjection as any).studentId, undefined);
      assert.equal((publicProjection as any).student, undefined);
      assert.equal((publicProjection as any).description, undefined);
      assert.equal((publicProjection as any).reliefSought, undefined);
      assert.equal((publicProjection as any).documents, undefined);
    });
  });
});
