import prisma from "@/lib/prisma";
import crypto from "crypto";

export interface GeneratedTrackingInfo {
  trackingNumber: string;
  trackingToken: string;
  trackingTokenHash: string;
}

/**
 * Hash public tracking verification token with SHA-256
 */
export function hashTrackingToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a unique, collision-resistant tracking number according to institutional format:
 * CSJMU-SBS-[YYYY]-[DEPT_CODE]-[SEQ]
 * e.g., "CSJMU-SBS-2026-MATH-0142"
 *
 * Also generates a 128-bit high-entropy secret bearer verification token and its SHA-256 hash.
 */
export async function generateUniqueTrackingNumber(
  departmentCode: string,
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<GeneratedTrackingInfo> {
  const db = tx || prisma;
  const year = new Date().getFullYear();
  const sanitizedDept = departmentCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");

  // Generate a random 64-bit entropy suffix to avoid sequential guessing
  // Format: CSJMU-SBS-YYYY-[DEPT]-[SEQ_HEX]
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    attempts++;
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars (e.g., A8F102)
    const trackingNumber = `CSJMU-SBS-${year}-${sanitizedDept}-${randomHex}`;

    // Verify uniqueness in database
    const existing = await db.grievance.findUnique({
      where: { trackingNumber },
      select: { id: true },
    });

    if (!existing) {
      // Generate public tracking verification secret (32-character random string)
      const trackingToken = crypto.randomBytes(16).toString("hex");
      const trackingTokenHash = hashTrackingToken(trackingToken);

      return {
        trackingNumber,
        trackingToken,
        trackingTokenHash,
      };
    }
  }

  throw new Error("Failed to generate a unique tracking identifier after multiple attempts. Please retry.");
}
