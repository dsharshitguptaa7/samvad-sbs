import os
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.entities import User, Department, Course, Grievance, StaffAssignment

client = TestClient(app)

def test_full_workflow_and_rbac():
    db = SessionLocal()
    try:
        # 1. Fetch active admin
        admin = db.query(User).filter(User.role == "SYSTEM_ADMIN", User.isActive == True).first()
        assert admin is not None

        # 2. Login as Admin
        admin_login = client.post("/api/auth/login", json={"identifier": admin.email, "password": "wrongpassword"})
        assert admin_login.status_code == 401

        # 3. Test Student Registration
        rand_suffix = uuid.uuid4().hex[:6]
        test_student_email = f"student_{rand_suffix}@csjmu.ac.in"
        test_roll = f"ROLL_{rand_suffix}"
        test_enroll = f"ENROLL_{rand_suffix}"

        reg_res = client.post(
            "/api/auth/register",
            json={
                "fullName": "Integration Student",
                "email": test_student_email,
                "password": "Password@123!",
                "rollNumber": test_roll,
                "enrollmentNo": test_enroll,
            },
        )
        assert reg_res.status_code == 200
        student_data = reg_res.json()["user"]
        assert student_data["email"] == test_student_email
        assert student_data["role"] == "STUDENT"

        # Cookie was set in test client
        me_res = client.get("/api/auth/me")
        assert me_res.status_code == 200
        assert me_res.json()["user"]["id"] == student_data["id"]

        # 4. Student cannot access admin endpoints (RBAC check)
        admin_forbidden = client.get("/api/admin/workflow")
        assert admin_forbidden.status_code == 403

        # 5. Student cannot access coordinator endpoints
        coord_forbidden = client.get("/api/coordinator/grievances")
        assert coord_forbidden.status_code == 403

        # 6. Student cannot access hod endpoints
        hod_forbidden = client.get("/api/department-head/grievances")
        assert hod_forbidden.status_code == 403

        # 7. Student cannot access director endpoints
        dir_forbidden = client.get("/api/director/grievances")
        assert dir_forbidden.status_code == 403

        # 8. Student submits grievance
        course = db.query(Course).filter(Course.isActive == True).first()
        assert course is not None

        sub_res = client.post(
            "/api/student/grievances",
            data={
                "courseId": course.id,
                "category": "ACADEMIC",
                "subject": "Integration Test Grievance Subject",
                "description": "Integration Test Grievance Detailed Description 12345.",
                "semester": 1,
            },
        )
        assert sub_res.status_code == 200
        g_data = sub_res.json()["grievance"]
        g_id = g_data["id"]
        assert g_data["trackingNumber"] is not None

        # 9. Anonymous track
        track_res = client.get(f"/api/track?trackingNumber={g_data['trackingNumber']}")
        assert track_res.status_code == 200
        assert track_res.json()["grievance"]["subject"] == "Integration Test Grievance Subject"

        # 10. Student view grievance detail
        detail_res = client.get(f"/api/student/grievances/{g_id}")
        assert detail_res.status_code == 200
        assert len(detail_res.json()["timelineActions"]) >= 1

        # 11. Cleanup test student and test grievance
        client.post("/api/auth/logout")
        created_g = db.query(Grievance).filter(Grievance.id == g_id).first()
        if created_g:
            for d in created_g.documents:
                db.delete(d)
            for t in created_g.timelineActions:
                db.delete(t)
            for dr in created_g.documentRequests:
                db.delete(dr)
            db.delete(created_g)

        created_student = db.query(User).filter(User.id == student_data["id"]).first()
        if created_student:
            db.delete(created_student)
        db.commit()

    finally:
        db.close()
