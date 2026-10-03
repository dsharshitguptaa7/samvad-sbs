/**
 * SAMVAD Development Seed Script
 * School of Basic Sciences, CSJMU Kanpur
 *
 * SAFETY NOTICE:
 * - This script is strictly for local/staging development environments.
 * - Seeds only clearly labeled fake test accounts (.test@csjmu.local).
 * - Never seeds real production credentials.
 * - Execution in production (NODE_ENV=production) is unconditionally aborted.
 */

import { PrismaClient, UserRole } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment from .env.local if available, otherwise .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

// Clearly fake development password hash (never use in production)
// In production, real passwords use Argon2id/bcrypt.
const FAKE_DEV_PASSWORD_HASH = "$2b$12$e8wV4oXwF0X1mS9Ym7Hn.O9kG1zV6hM2lU7pQ5rT8sW3vX4yZ0a1b"; // DevTest#2026!

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ ERROR: Database seeding is forbidden in production mode.");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("❌ ERROR: DATABASE_URL is not configured. Please set DATABASE_URL in .env.local.");
    process.exit(1);
  }

  console.log("🌱 Starting SAMVAD development database seeding...");

  // ---------------------------------------------------------------------------
  // 1. SEED DEPARTMENTS
  // ---------------------------------------------------------------------------
  console.log("📁 Seeding initial School of Basic Sciences departments...");

  const departmentsData = [
    {
      code: "MATH",
      name: "Department of Mathematics",
      description: "Pure & Applied Mathematics, Numerical Analysis, Mathematical Modeling, and Operational Research.",
    },
    {
      code: "PHYS",
      name: "Department of Physics",
      description: "Condensed Matter Physics, Electronics, Nuclear Physics, Optics, and Advanced Experimental Laboratories.",
    },
    {
      code: "CHEM",
      name: "Department of Chemistry",
      description: "Organic, Inorganic, Physical, and Analytical Chemistry with wet lab research facilities.",
    },
    {
      code: "GEOG",
      name: "Department of Geography",
      description: "Geomorphology, Cartography, GIS & Remote Sensing, Climatology, and Regional Planning Studies.",
    },
    {
      code: "ENVS",
      name: "Department of Environmental Sciences",
      description: "Ecological Conservation, Environmental Toxicology, Waste Management, and Climate Dynamics.",
    },
  ];

  const departments: Record<string, any> = {};
  for (const dept of departmentsData) {
    departments[dept.code] = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, description: dept.description },
      create: dept,
    });
    console.log(`  ✓ Department: ${dept.name} (${dept.code})`);
  }

  // ---------------------------------------------------------------------------
  // 2. SEED COURSES
  // ---------------------------------------------------------------------------
  console.log("📚 Seeding sample academic courses...");

  const coursesData = [
    // Mathematics
    { departmentCode: "MATH", code: "BSCMATH", name: "B.Sc. Mathematics", programType: "Undergraduate" },
    { departmentCode: "MATH", code: "MSCMATH", name: "M.Sc. Mathematics", programType: "Postgraduate" },
    { departmentCode: "MATH", code: "PHDMATH", name: "Ph.D. Mathematics", programType: "Doctoral" },
    // Physics
    { departmentCode: "PHYS", code: "BSCPHYS", name: "B.Sc. Physics", programType: "Undergraduate" },
    { departmentCode: "PHYS", code: "MSCPHYS", name: "M.Sc. Physics", programType: "Postgraduate" },
    // Chemistry
    { departmentCode: "CHEM", code: "BSCCHEM", name: "B.Sc. Chemistry", programType: "Undergraduate" },
    { departmentCode: "CHEM", code: "MSCCHEM", name: "M.Sc. Chemistry", programType: "Postgraduate" },
    // Geography
    { departmentCode: "GEOG", code: "BSCGEOG", name: "B.A. / B.Sc. Geography", programType: "Undergraduate" },
    { departmentCode: "GEOG", code: "MSCGEOG", name: "M.A. / M.Sc. Geography", programType: "Postgraduate" },
    // Environmental Sciences
    { departmentCode: "ENVS", code: "MSCENVS", name: "M.Sc. Environmental Science", programType: "Postgraduate" },
  ];

  const courses: Record<string, any> = {};
  for (const crs of coursesData) {
    const dept = departments[crs.departmentCode];
    courses[crs.code] = await prisma.course.upsert({
      where: {
        departmentId_code: {
          departmentId: dept.id,
          code: crs.code,
        },
      },
      update: { name: crs.name, programType: crs.programType },
      create: {
        departmentId: dept.id,
        code: crs.code,
        name: crs.name,
        programType: crs.programType,
      },
    });
    console.log(`  ✓ Course: ${crs.name} (${crs.code})`);
  }

  // ---------------------------------------------------------------------------
  // 3. SEED FAKE TEST ACCOUNTS ONLY (Clearly marked fake test accounts)
  // ---------------------------------------------------------------------------
  console.log("👥 Seeding clearly fake test accounts for local development...");

  // System Administrator (Fake Test Account)
  const testAdmin = await prisma.user.upsert({
    where: { email: "admin.test@csjmu.local" },
    update: {},
    create: {
      email: "admin.test@csjmu.local",
      fullName: "Test System Administrator",
      role: UserRole.SYSTEM_ADMIN,
      passwordHash: FAKE_DEV_PASSWORD_HASH,
      phoneNumber: "9876500001",
      isActive: true,
      mustResetPassword: false,
    },
  });
  console.log(`  ✓ Test Admin: ${testAdmin.email}`);

  // Director SBS (Fake Test Account)
  const testDirector = await prisma.user.upsert({
    where: { email: "director.sbs.test@csjmu.local" },
    update: {},
    create: {
      email: "director.sbs.test@csjmu.local",
      fullName: "Test Director SBS",
      role: UserRole.DIRECTOR,
      passwordHash: FAKE_DEV_PASSWORD_HASH,
      phoneNumber: "9876500002",
      isActive: true,
      mustResetPassword: false,
    },
  });
  console.log(`  ✓ Test Director: ${testDirector.email}`);

  // Department Head - Mathematics (Fake Test Account)
  const testHodMath = await prisma.user.upsert({
    where: { email: "hod.math.test@csjmu.local" },
    update: {},
    create: {
      email: "hod.math.test@csjmu.local",
      fullName: "Test HoD Mathematics",
      role: UserRole.DEPARTMENT_HEAD,
      passwordHash: FAKE_DEV_PASSWORD_HASH,
      phoneNumber: "9876500003",
      isActive: true,
      mustResetPassword: false,
    },
  });
  console.log(`  ✓ Test HoD: ${testHodMath.email}`);

  // Course Coordinator - M.Sc. Mathematics (Fake Test Account)
  const testCoordMath = await prisma.user.upsert({
    where: { email: "coord.math.test@csjmu.local" },
    update: {},
    create: {
      email: "coord.math.test@csjmu.local",
      fullName: "Test Coordinator M.Sc. Math",
      role: UserRole.COURSE_COORDINATOR,
      passwordHash: FAKE_DEV_PASSWORD_HASH,
      phoneNumber: "9876500004",
      isActive: true,
      mustResetPassword: false,
    },
  });
  console.log(`  ✓ Test Coordinator: ${testCoordMath.email}`);

  // Student (Fake Test Account)
  const testStudent = await prisma.user.upsert({
    where: { email: "student.test@csjmu.local" },
    update: {},
    create: {
      email: "student.test@csjmu.local",
      fullName: "Test Student M.Sc. Math",
      role: UserRole.STUDENT,
      passwordHash: FAKE_DEV_PASSWORD_HASH,
      phoneNumber: "9876500005",
      rollNumber: "240103001",
      enrollmentNo: "CSJM2024S1001",
      isActive: true,
      mustResetPassword: false,
    },
  });
  console.log(`  ✓ Test Student: ${testStudent.email} (Roll: 240103001)`);

  // ---------------------------------------------------------------------------
  // 4. SEED STAFF ASSIGNMENTS (Tenancy & Authority Mappings)
  // ---------------------------------------------------------------------------
  console.log("🔗 Seeding authority mappings (Staff Assignments)...");

  // Assign HoD to Mathematics Department
  const existingHodAssignment = await prisma.staffAssignment.findFirst({
    where: {
      userId: testHodMath.id,
      departmentId: departments["MATH"].id,
      isActive: true,
    },
  });
  if (!existingHodAssignment) {
    await prisma.staffAssignment.create({
      data: {
        userId: testHodMath.id,
        role: UserRole.DEPARTMENT_HEAD,
        departmentId: departments["MATH"].id,
        courseId: null, // HoD oversees entire department
        isActive: true,
      },
    });
    console.log("  ✓ Assigned HoD -> Department of Mathematics");
  }

  // Assign Coordinator to M.Sc. Mathematics Course
  const existingCoordAssignment = await prisma.staffAssignment.findFirst({
    where: {
      userId: testCoordMath.id,
      courseId: courses["MSCMATH"].id,
      isActive: true,
    },
  });
  if (!existingCoordAssignment) {
    await prisma.staffAssignment.create({
      data: {
        userId: testCoordMath.id,
        role: UserRole.COURSE_COORDINATOR,
        departmentId: departments["MATH"].id,
        courseId: courses["MSCMATH"].id,
        isActive: true,
      },
    });
    console.log("  ✓ Assigned Coordinator -> M.Sc. Mathematics Course");
  }

  console.log("✅ Seed completed successfully with safe development data.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
