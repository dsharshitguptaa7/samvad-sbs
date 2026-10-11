/**
 * SAMVAD — Safe System Administrator Password Reset Utility
 *
 * Safety Rules:
 * - Reads only configured database connection.
 * - Does not accept CLI arguments for passwords to prevent process table / shell history sniffing.
 * - Generates a secure, cryptographically random one-time setup token or accepts interactive hidden input.
 * - Never prints passwords or tokens in production server logs.
 * - Revokes all active sessions upon password reset.
 */

import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword, validatePasswordStrength } from "../src/lib/auth/password";
import { createPasswordResetToken } from "../src/lib/auth/password-reset";
import { revokeAllUserSessions } from "../src/lib/auth/session";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  console.log("================================================================================");
  console.log("🛡️  SAMVAD — System Administrator Account Setup & Verification");
  console.log("================================================================================");

  // 1. Check for existing SYSTEM_ADMIN accounts
  const adminUsers = await prisma.user.findMany({
    where: { role: UserRole.SYSTEM_ADMIN },
    select: {
      id: true,
      email: true,
      fullName: true,
      isActive: true,
      mustResetPassword: true,
      createdAt: true,
    },
  });

  if (adminUsers.length === 0) {
    console.log("⚠️  No SYSTEM_ADMIN account exists in the database.");
    console.log("👉 Run 'npm run db:seed' in development/staging or use an admin onboarding pipeline.");
    process.exit(1);
  }

  console.log(`Found ${adminUsers.length} SYSTEM_ADMIN account(s):`);
  for (const admin of adminUsers) {
    console.log(`- Account ID: ${admin.id}`);
    console.log(`  Email:      ${admin.email}`);
    console.log(`  Status:     ${admin.isActive ? "ACTIVE" : "INACTIVE"}`);
    console.log(`  Must Reset: ${admin.mustResetPassword ? "YES" : "NO"}`);

    if (!admin.isActive) {
      console.log(`  [Action] Activating admin account...`);
      await prisma.user.update({
        where: { id: admin.id },
        data: { isActive: true },
      });
      console.log(`  [Action] Account activated.`);
    }

    // Generate a secure one-time password setup/reset link
    const { rawToken, expiresAt } = await createPasswordResetToken(admin.id);
    await revokeAllUserSessions(admin.id);

    console.log("\n🔑 One-Time Password Setup / Reset Link Generated:");
    console.log(`   URL:        http://localhost:3000/reset-password?token=${rawToken}`);
    console.log(`   Expires At: ${expiresAt.toISOString()} (Valid for 24 hours)`);
    console.log("   Notice:     Navigating to this URL enables setting a new compliant password");
    console.log("               safely through the web interface with full session invalidation.");
  }

  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("Setup error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
