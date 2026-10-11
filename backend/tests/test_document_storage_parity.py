import os
import io
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.entities import User, Course, Department, Grievance, GrievanceDocument
from backend.app.core.security import create_user_session
from backend.app.services.storage import StorageService, validate_file_signature

client = TestClient(app)

# Real valid magic bytes payloads
VALID_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
VALID_WEBP_BYTES = b"RIFF\x24\x00\x00\x00WEBPVP8 \x18\x00\x00\x00" + b"\x00" * 24
VALID_PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 20
SPOOFED_WEBP_BYTES = b"This is a fake text file claiming to be webp format"
OVERSIZED_PDF_BYTES = b"%PDF-1.4\n" + b"A" * (5 * 1024 * 1024 + 100)

def test_storage_service_signature_validation():
    assert validate_file_signature(VALID_PDF_BYTES, "application/pdf") is True
    assert validate_file_signature(VALID_WEBP_BYTES, "image/webp") is True
    assert validate_file_signature(VALID_PNG_BYTES, "image/png") is True
    assert validate_file_signature(SPOOFED_WEBP_BYTES, "image/webp") is False
    assert validate_file_signature(b"plain", "application/pdf") is False

def test_document_upload_and_download_lifecycle():
    db = SessionLocal()
    try:
        # Find active student and course
        student1 = db.query(User).filter(User.role == "STUDENT", User.isActive == True).first()
        student2 = db.query(User).filter(User.role == "STUDENT", User.isActive == True, User.id != student1.id).first()
        admin_user = db.query(User).filter(User.role == "SYSTEM_ADMIN", User.isActive == True).first()
        course = db.query(Course).filter(Course.isActive == True).first()

        assert student1 is not None, "Active student required"
        assert student2 is not None, "Second active student required for access-denial test"
        assert admin_user is not None, "Admin required for access-denial test"
        assert course is not None, "Active course required"

        token_student1, _ = create_user_session(db, student1.id)
        token_student2, _ = create_user_session(db, student2.id)
        token_admin, _ = create_user_session(db, admin_user.id)

        # Test 1: Upload with spoofed signature should be rejected (400)
        client.cookies.set("samvad_session", token_student1)
        spoofed_payload = {
            "courseId": course.id,
            "category": "ACADEMIC",
            "subject": "Test Spoofed Document",
            "description": "Should fail due to invalid magic bytes.",
        }
        res_spoofed = client.post(
            "/api/student/grievances",
            data=spoofed_payload,
            files=[("files", ("evidence.webp", io.BytesIO(SPOOFED_WEBP_BYTES), "image/webp"))],
        )
        assert res_spoofed.status_code == 400
        assert "signature" in res_spoofed.json().get("detail", "").lower()

        # Test 2: Upload with oversized file (>5MB) should be rejected (400)
        res_oversized = client.post(
            "/api/student/grievances",
            data=spoofed_payload,
            files=[("files", ("huge.pdf", io.BytesIO(OVERSIZED_PDF_BYTES), "application/pdf"))],
        )
        assert res_oversized.status_code == 400
        assert "exceeds maximum allowed size" in res_oversized.json().get("detail", "").lower()

        # Test 3: Real legitimate WebP and PDF upload should succeed (200)
        valid_payload = {
            "courseId": course.id,
            "category": "ACADEMIC",
            "subject": "Valid Evidence Document Grievance",
            "description": "Testing real webp and pdf file uploads on persistent disk.",
            "reliefSought": "Expedited resolution",
            "declarationConfirmed": "true",
        }
        res_success = client.post(
            "/api/student/grievances",
            data=valid_payload,
            files=[
                ("files", ("screenshot.webp", io.BytesIO(VALID_WEBP_BYTES), "image/webp")),
                ("files", ("syllabus.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")),
            ],
        )
        assert res_success.status_code == 200, f"Upload failed: {res_success.text}"
        data = res_success.json()
        assert data["success"] is True
        tracking_num = data["trackingNumber"]
        grievance_id = data["grievanceId"]

        # Test 4: Verify metadata persistence in DB
        db.expire_all()
        doc_records = db.query(GrievanceDocument).filter(GrievanceDocument.grievanceId == grievance_id).all()
        assert len(doc_records) == 2, "Expected 2 uploaded documents persisted in database"
        
        webp_doc = next(d for d in doc_records if d.mimeType == "image/webp")
        pdf_doc = next(d for d in doc_records if d.mimeType == "application/pdf")

        assert webp_doc.fileName == "screenshot.webp"
        assert webp_doc.fileSize == len(VALID_WEBP_BYTES)
        assert webp_doc.storageKey.endswith(".webp")
        assert len(webp_doc.sha256Hash) == 64

        assert pdf_doc.fileName == "syllabus.pdf"
        assert pdf_doc.fileSize == len(VALID_PDF_BYTES)
        assert pdf_doc.storageKey.endswith(".pdf")
        assert len(pdf_doc.sha256Hash) == 64

        # Test 5: Authorized student can download their uploaded document
        client.cookies.set("samvad_session", token_student1)
        res_dl = client.get(f"/api/documents/{webp_doc.id}")
        assert res_dl.status_code == 200
        assert res_dl.content == VALID_WEBP_BYTES
        assert res_dl.headers["content-type"] == "image/webp"
        assert "private" in res_dl.headers["cache-control"]
        assert res_dl.headers["x-content-type-options"] == "nosniff"

        # Also test /download route alias
        res_dl_alias = client.get(f"/api/documents/{webp_doc.id}/download")
        assert res_dl_alias.status_code == 200
        assert res_dl_alias.content == VALID_WEBP_BYTES

        # Test 6: Unauthorized student (different student) cannot download
        client.cookies.set("samvad_session", token_student2)
        res_unauth = client.get(f"/api/documents/{webp_doc.id}")
        assert res_unauth.status_code == 403
        assert "Access denied" in res_unauth.json().get("detail", "")

        # Test 7: System Admin cannot inspect evidence (separation of powers)
        client.cookies.set("samvad_session", token_admin)
        res_admin = client.get(f"/api/documents/{webp_doc.id}")
        assert res_admin.status_code == 403
        assert "Administrators cannot inspect" in res_admin.json().get("detail", "")

        # Test 8: Simulate backend restart/redeploy by reinitializing StorageService
        # The file on disk must persist and remain readable with identical content.
        new_storage_service = StorageService()
        new_storage_service.verify_storage_health()
        persisted_content, persisted_mime = pytest.helpers_get_file_sync(new_storage_service, webp_doc.storageKey)
        assert persisted_content == VALID_WEBP_BYTES
        assert persisted_mime == "image/webp"

    finally:
        db.close()

import asyncio
def sync_get_file(svc, key):
    return asyncio.run(svc.get_file_content(key))

class Helpers:
    @staticmethod
    def get_file(svc, key):
        return asyncio.run(svc.get_file_content(key))

pytest.helpers_get_file_sync = sync_get_file
