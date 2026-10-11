import prisma from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { UserRole } from "@prisma/client";

async function testHttp() {
  const BASE = "http://localhost:3005";
  console.log("=== 1. Testing Unauthenticated Page Access ===");
  for (const path of ["/admin", "/student", "/coordinator", "/department-head", "/director"]) {
    const res = await fetch(BASE + path, { redirect: "manual" });
    console.log(
      path.padEnd(18),
      "Status:",
      res.status,
      "Location:",
      res.headers.get("location"),
      "Cache-Control:",
      res.headers.get("cache-control")
    );
  }

  console.log("\n=== 2. Testing Unauthenticated Protected APIs ===");
  for (const path of [
    "/api/admin/staff",
    "/api/student/grievances",
    "/api/coordinator/grievances",
    "/api/department-head/grievances",
    "/api/director/grievances",
    "/api/auth/me",
  ]) {
    const res = await fetch(BASE + path);
    const json = await res.json().catch(() => null);
    console.log(
      path.padEnd(35),
      "Status:",
      res.status,
      "Code:",
      json?.code || json?.error,
      "Cache-Control:",
      res.headers.get("cache-control")
    );
  }

  console.log("\n=== 3. Testing Public Pages ===");
  for (const path of ["/", "/login", "/register", "/track"]) {
    const res = await fetch(BASE + path);
    console.log(path.padEnd(18), "Status:", res.status);
  }

  console.log("\n=== 4. Testing End-to-End Login, Session Persistence & RBAC ===");
  const email = "http.verify.student@csjmu.ac.in";
  const pass = "VerifySecret#2026";
  await prisma.session.deleteMany({ where: { user: { email } } });
  await prisma.user.deleteMany({ where: { email } });
  const hash = await hashPassword(pass);
  const student = await prisma.user.create({
    data: {
      email,
      fullName: "HTTP Verify Student",
      passwordHash: hash,
      role: UserRole.STUDENT,
      rollNumber: "VERIFY2401",
      isActive: true,
    },
  });

  // Login via POST /api/auth/login
  const loginRes = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: email, password: pass, portalType: "student" }),
  });
  const loginJson = await loginRes.json();
  const setCookie = loginRes.headers.get("set-cookie");
  console.log(
    "Login Status:",
    loginRes.status,
    "Success:",
    loginJson.success,
    "RedirectUrl:",
    loginJson.redirectUrl
  );
  console.log("Cookie received:", setCookie ? setCookie.split(";")[0] : "NONE");

  const cookieHeader = setCookie ? setCookie.split(";")[0] : "";

  // GET /api/auth/me with cookie
  const meRes = await fetch(BASE + "/api/auth/me", {
    headers: { cookie: cookieHeader },
  });
  const meJson = await meRes.json();
  console.log(
    "Me API Status:",
    meRes.status,
    "User Role:",
    meJson.user?.role,
    "Email:",
    meJson.user?.email
  );

  // Authenticated user visits /login (should redirect to /student via 307 or NEXT_REDIRECT streaming digest)
  const loginPageRes = await fetch(BASE + "/login", {
    headers: { cookie: cookieHeader },
    redirect: "manual",
  });
  const loginPageHtml = await loginPageRes.text();
  const loginRedirectTarget =
    loginPageRes.headers.get("location") ||
    (loginPageHtml.match(/NEXT_REDIRECT;[^;]+;([^;]+);/)?.[1] ??
      loginPageHtml.match(/url=([^\/"]*\/[^\/"]*)/)?.[1]);
  console.log(
    "Visiting /login while authenticated: Status:",
    loginPageRes.status,
    "Redirect Location / Digest Target:",
    loginRedirectTarget
  );

  // Authenticated student visits /student (authorized)
  const studentPageRes = await fetch(BASE + "/student", {
    headers: { cookie: cookieHeader },
    redirect: "manual",
  });
  console.log("Visiting /student while authenticated: Status:", studentPageRes.status);

  // Authenticated student visits /admin (unauthorized - role boundary)
  const adminPageRes = await fetch(BASE + "/admin", {
    headers: { cookie: cookieHeader },
    redirect: "manual",
  });
  const adminHtml = await adminPageRes.text();
  const is403 =
    adminHtml.includes("403 Forbidden") &&
    adminHtml.includes("Access Denied") &&
    adminHtml.includes("restricted exclusively to System Administrators");
  console.log(
    "Visiting /admin as student: Status:",
    adminPageRes.status,
    "Shows 403 Forbidden UI:",
    is403
  );

  // Logout via POST /api/auth/logout
  const logoutRes = await fetch(BASE + "/api/auth/logout", {
    method: "POST",
    headers: { cookie: cookieHeader },
  });
  const logoutJson = await logoutRes.json();
  const logoutCookie = logoutRes.headers.get("set-cookie");
  console.log(
    "Logout Status:",
    logoutRes.status,
    "Message:",
    logoutJson.message,
    "Cookie cleared:",
    Boolean(
      logoutCookie?.includes("Max-Age=0") ||
        logoutCookie?.includes("expires=") ||
        logoutCookie?.includes("samvad_session=;")
    )
  );

  // Accessing /student after logout -> should redirect to /login!
  const postLogoutRes = await fetch(BASE + "/student", {
    headers: { cookie: logoutCookie ? logoutCookie.split(";")[0] : "" },
    redirect: "manual",
  });
  console.log(
    "Visiting /student after logout: Status:",
    postLogoutRes.status,
    "Redirect Location:",
    postLogoutRes.headers.get("location")
  );

  // Cleanup
  await prisma.session.deleteMany({ where: { userId: student.id } });
  await prisma.user.delete({ where: { id: student.id } });
  console.log("Verification finished successfully.");
}

testHttp()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
