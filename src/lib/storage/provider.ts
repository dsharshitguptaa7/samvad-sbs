import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface StoredFileMetadata {
  storageKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256Hash: string;
}

export interface StorageProvider {
  saveFile(buffer: Buffer, originalName: string, mimeType: string): Promise<StoredFileMetadata>;
  getFile(storageKey: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
  deleteFile(storageKey: string): Promise<boolean>;
}

// Security Configuration
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"] as const;

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Validates file buffer magic bytes (file signature) to detect spoofed MIME types.
 */
export function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;

  // PDF magic bytes: %PDF (0x25 0x50 0x44 0x46)
  if (mimeType === "application/pdf") {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }

  // JPEG magic bytes: FF D8 FF
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // WEBP magic bytes: RIFF....WEBP
  if (mimeType === "image/webp") {
    if (buffer.length < 12) return false;
    const riff = buffer.subarray(0, 4).toString("ascii");
    const webp = buffer.subarray(8, 12).toString("ascii");
    return riff === "RIFF" && webp === "WEBP";
  }

  return false;
}

/**
 * Sanitize filename to prevent directory traversal and injection.
 */
export function sanitizeFileName(name: string): string {
  const base = path.basename(name);
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

/**
 * Local Secure File System Storage Provider
 * Stores files outside the web root in private storage directory.
 */
class LocalDiskStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = process.env.STORAGE_LOCAL_DIR
      ? path.resolve(process.env.STORAGE_LOCAL_DIR)
      : path.resolve(process.cwd(), ".storage", "grievances");
  }

  private async ensureDir() {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  async saveFile(buffer: Buffer, originalName: string, mimeType: string): Promise<StoredFileMetadata> {
    await this.ensureDir();

    // 1. Validate file size
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size (${(buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed 5MB`);
    }

    // 2. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType as any)) {
      throw new Error(`MIME type '${mimeType}' is not allowed. Only PDF, JPEG, PNG, and WebP are accepted.`);
    }

    // 3. Validate extension
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext as any)) {
      throw new Error(`File extension '${ext}' is not permitted.`);
    }

    // 4. Validate file signature magic bytes
    if (!validateFileSignature(buffer, mimeType)) {
      throw new Error(`File content signature does not match declared MIME type '${mimeType}'.`);
    }

    // 5. Generate secure UUID-based storage key and compute SHA-256 hash
    const storageKey = crypto.randomUUID() + ext;
    const sha256Hash = crypto.createHash("sha256").update(buffer).digest("hex");
    const sanitizedName = sanitizeFileName(originalName);

    const targetPath = path.join(this.baseDir, storageKey);

    // Prevent directory traversal
    if (!targetPath.startsWith(this.baseDir)) {
      throw new Error("Invalid destination storage path");
    }

    await fs.writeFile(targetPath, buffer);

    return {
      storageKey,
      fileName: sanitizedName,
      fileSize: buffer.length,
      mimeType,
      sha256Hash,
    };
  }

  async getFile(storageKey: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    // Prevent path traversal
    const safeKey = path.basename(storageKey);
    const targetPath = path.join(this.baseDir, safeKey);

    try {
      const buffer = await fs.readFile(targetPath);
      const ext = path.extname(safeKey).toLowerCase();
      let mimeType = "application/octet-stream";
      if (ext === ".pdf") mimeType = "application/pdf";
      else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
      else if (ext === ".png") mimeType = "image/png";
      else if (ext === ".webp") mimeType = "image/webp";

      return { buffer, mimeType };
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return null;
      }
      throw err;
    }
  }

  async deleteFile(storageKey: string): Promise<boolean> {
    const safeKey = path.basename(storageKey);
    const targetPath = path.join(this.baseDir, safeKey);
    try {
      await fs.unlink(targetPath);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance of storage provider
export const storageProvider: StorageProvider = new LocalDiskStorageProvider();
