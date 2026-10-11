import os
import uuid
import hashlib
import aiofiles
from fastapi import UploadFile, HTTPException, status
from backend.app.core.config import settings

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}

def validate_file_signature(content: bytes, mime_type: str) -> bool:
    """Verify magic bytes to protect against spoofed MIME extensions."""
    if len(content) < 4:
        return False
    if mime_type == "application/pdf":
        return content.startswith(b"%PDF")
    if mime_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if mime_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if mime_type == "image/webp":
        return len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"
    return False

def sanitize_filename(filename: str) -> str:
    base = os.path.basename(filename)
    clean = "".join(c for c in base if c.isalnum() or c in "._-")
    return clean[:100]

class StorageService:
    def __init__(self):
        self.base_dir = os.path.abspath(settings.STORAGE_LOCAL_DIR)
        os.makedirs(self.base_dir, exist_ok=True)

    async def save_file(self, upload_file: UploadFile) -> dict:
        content = await upload_file.read()
        file_size = len(content)

        if file_size > settings.MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of 5MB.",
            )

        mime_type = upload_file.content_type or "application/octet-stream"
        if mime_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"MIME type '{mime_type}' not permitted. Only PDF, JPEG, PNG, and WebP are accepted.",
            )

        ext = os.path.splitext(upload_file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension '{ext}' not permitted.",
            )

        if not validate_file_signature(content, mime_type):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content signature does not match declared MIME type.",
            )

        storage_key = f"{uuid.uuid4()}{ext}"
        sha256_hash = hashlib.sha256(content).hexdigest()
        sanitized_name = sanitize_filename(upload_file.filename or "upload")

        target_path = os.path.join(self.base_dir, storage_key)
        async with aiofiles.open(target_path, "wb") as f:
            await f.write(content)

        return {
            "storageKey": storage_key,
            "fileName": sanitized_name,
            "fileSize": file_size,
            "mimeType": mime_type,
            "sha256Hash": sha256_hash,
        }

    async def get_file_content(self, storage_key: str) -> tuple[bytes, str] | None:
        safe_key = os.path.basename(storage_key)
        target_path = os.path.join(self.base_dir, safe_key)
        if not os.path.exists(target_path):
            return None

        ext = os.path.splitext(safe_key)[1].lower()
        mime_type = "application/octet-stream"
        if ext == ".pdf":
            mime_type = "application/pdf"
        elif ext in [".jpg", ".jpeg"]:
            mime_type = "image/jpeg"
        elif ext == ".png":
            mime_type = "image/png"
        elif ext == ".webp":
            mime_type = "image/webp"

        async with aiofiles.open(target_path, "rb") as f:
            content = await f.read()

        return content, mime_type

storage_service = StorageService()
