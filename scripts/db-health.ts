/**
 * SAMVAD Database Health Check Utility
 * School of Basic Sciences, CSJMU Kanpur
 *
 * SAFETY NOTICE:
 * - Sanitizes database connection strings before output.
 * - Never prints credentials, passwords, or authentication tokens.
 * - Provides non-blocking diagnostic reports when database is not configured.
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

// Load server-side environment variables (.env.local has precedence over .env)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function maskConnectionString(urlStr: string | undefined): string {
  if (!urlStr) return "(none)";
  try {
    const parsed = new URL(urlStr);
    const maskedUser = parsed.username ? parsed.username : "";
    const maskedPass = parsed.password ? "********" : "";
    const authPart = maskedUser ? `${maskedUser}:${maskedPass}@` : "";
    return `${parsed.protocol}//${authPart}${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    // If not standard URL format, redact potential password patterns
    return urlStr.replace(/:[^:@/]+@/, ":********@");
  }
}

function sanitizeErrorMessage(errorMsg: string): string {
  return errorMsg.replace(/:[^:@/\s]+@/g, ":********@");
}

async function runHealthCheck() {
  console.log("================================================================================");
  console.log("🔍 SAMVAD Neon PostgreSQL Health Check");
  console.log("================================================================================");

  const rawUrl = process.env.DATABASE_URL;
  const rawDirectUrl = process.env.DIRECT_URL;

  if (!rawUrl || rawUrl.trim() === "") {
    console.log("Status:        ⚠️  BLOCKED (DATABASE_URL is not set)");
    console.log("Details:       No connection string was found in .env.local or environment.");
    console.log("Action Needed: 1. Create .env.local from .env.example");
    console.log("               2. Provide valid Neon connection string for DATABASE_URL");
    console.log("               3. Provide unpooled DIRECT_URL for Prisma migrations");
    console.log("================================================================================");
    process.exit(1);
  }

  // Check if unedited placeholder from .env.example
  if (
    rawUrl.includes("YOUR_NEON_PASSWORD") ||
    rawUrl.includes("[password]") ||
    rawUrl.includes("ep-samvad-pooler")
  ) {
    console.log("Status:        ⚠️  BLOCKED (Placeholder values detected)");
    console.log("Details:       DATABASE_URL still contains default template placeholder values.");
    console.log(`Configured:    ${maskConnectionString(rawUrl)}`);
    console.log("Action Needed: Replace placeholder values in .env.local with real Neon project credentials.");
    console.log("================================================================================");
    process.exit(1);
  }

  console.log(`Target Host:   ${maskConnectionString(rawUrl)}`);
  console.log(`Direct Host:   ${maskConnectionString(rawDirectUrl)}`);
  console.log("Testing live connectivity to PostgreSQL database...");

  const startTime = Date.now();
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: rawUrl,
      },
    },
    log: ["error"],
  });

  try {
    const result = await prisma.$queryRaw<
      Array<{
        healthy: number;
        db_name: string;
        pg_version: string;
        now_ts: Date;
      }>
    >`SELECT 1 as healthy, current_database() as db_name, version() as pg_version, current_timestamp as now_ts`;

    const latencyMs = Date.now() - startTime;
    const dbInfo = result[0];

    console.log("Status:        ✅ HEALTHY & CONNECTED");
    console.log(`Database Name: ${dbInfo.db_name}`);
    console.log(`Engine:        ${dbInfo.pg_version.split(" on ")[0]}`);
    console.log(`Server Time:   ${dbInfo.now_ts.toISOString()}`);
    console.log(`Ping Latency:  ${latencyMs} ms`);
    console.log("================================================================================");
    console.log("Prisma Client is ready for queries and transaction execution.");
  } catch (err: any) {
    const cleanError = sanitizeErrorMessage(err?.message || String(err));
    console.log("Status:        ❌ CONNECTION FAILED");
    console.log(`Error Details: ${cleanError}`);
    console.log("Troubleshooting:");
    console.log("  - Verify that the Neon project is active and not suspended.");
    console.log("  - Check whether SSL is enabled (?sslmode=require).");
    console.log("  - Verify user credentials and database name in .env.local.");
    console.log("================================================================================");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runHealthCheck();
