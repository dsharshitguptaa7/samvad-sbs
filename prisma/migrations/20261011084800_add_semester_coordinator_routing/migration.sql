-- AlterTable Course
ALTER TABLE "Course" ADD COLUMN "totalSemesters" INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "Course" ADD COLUMN "academicPeriod" TEXT DEFAULT 'ALL';

-- AlterTable StaffAssignment
ALTER TABLE "StaffAssignment" ADD COLUMN "semesters" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "StaffAssignment" ADD COLUMN "academicPeriod" TEXT;

-- AlterTable Grievance
ALTER TABLE "Grievance" ADD COLUMN "semester" INTEGER;

-- CreateIndex
CREATE INDEX "Grievance_courseId_semester_currentTier_currentStatus_idx" ON "Grievance"("courseId", "semester", "currentTier", "currentStatus");
