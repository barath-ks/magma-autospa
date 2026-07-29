import { db } from "../lib/db";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

async function login(loginId: string) {
  const res1 = await fetch("http://localhost:3000/api/auth/csrf");
  const data1 = await res1.json();
  const csrfToken = data1.csrfToken;
  const cookie1 = res1.headers.get("set-cookie") || "";

  const formData = new URLSearchParams();
  formData.append("csrfToken", csrfToken);
  formData.append("login_id", loginId);
  formData.append("password", "password");
  formData.append("json", "true");

  const res2 = await fetch("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookie1
    },
    body: formData.toString()
  });

  const cookies = res2.headers.getSetCookie();
  const cookieHeader = cookies.map(c => c.split(";")[0]).join("; ");
  return cookieHeader;
}

async function run() {
  console.log("Setting up E2E verification for Profile Requests...");

  const hash = await bcrypt.hash("password", 10);
  
  // Ensure branch 2 manager exists
  await db.execute("INSERT OR IGNORE INTO branches (id, name, location) VALUES ('branch-2', 'Branch 2', 'Loc 2')");
  await db.execute("DELETE FROM users WHERE login_id = 'test_manager_2'");
  await db.execute({
    sql: "INSERT INTO users (id, login_id, password_hash, role, branch_id, name) VALUES (?, ?, ?, ?, ?, ?)",
    args: [uuidv4(), 'test_manager_2', hash, 'manager', 'branch-2', 'Manager 2']
  });

  const cookieStaffA = await login("test_staff_a"); // Branch 1
  const cookieManager1 = await login("test_manager"); // Branch 1
  const cookieManager2 = await login("test_manager_2"); // Branch 2

  console.log("\\n--- 1. Submit Name Change Request (Staff A) ---");
  const reqRes = await fetch("http://localhost:3000/api/settings/profile-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": cookieStaffA },
    body: JSON.stringify({ field_type: "name", requested_value: "Staff A Edited" })
  });
  const reqData = await reqRes.json();
  console.log("Submit status:", reqRes.status, reqData);
  const requestId = reqData.id;

  if (!requestId) {
    console.error("Failed to get request ID");
    return;
  }

  console.log("\\n--- 2. Attempt Approve (Manager 2 - Different Branch) ---");
  // They should not find the request (404 because checkResult rows is 0)
  const appRes2 = await fetch("http://localhost:3000/api/manager/profile-requests", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Cookie": cookieManager2 },
    body: JSON.stringify({ id: requestId, status: "approved" })
  });
  console.log("Approve by Manager 2 status:", appRes2.status, await appRes2.json());

  console.log("\\n--- 3. Attempt Approve (Manager 1 - Same Branch) ---");
  const appRes1 = await fetch("http://localhost:3000/api/manager/profile-requests", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Cookie": cookieManager1 },
    body: JSON.stringify({ id: requestId, status: "approved" })
  });
  console.log("Approve by Manager 1 status:", appRes1.status, await appRes1.json());

  console.log("\\n--- 4. Verify DB Update ---");
  const dbCheck = await db.execute("SELECT name FROM users WHERE login_id = 'test_staff_a'");
  console.log("DB staff name:", dbCheck.rows[0].name, "(Expected: Staff A Edited)");
}

run();
