import { db } from "../lib/db";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

async function loginAndGetCookie(login_id, password) {
  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
  const csrfData = await csrfRes.json();
  
  const res = await fetch("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": csrfRes.headers.get("set-cookie") || ""
    },
    body: new URLSearchParams({
      login_id,
      password,
      csrfToken: csrfData.csrfToken,
      json: "true"
    })
  });
  
  const cookies = res.headers.get("set-cookie");
  if (!cookies) throw new Error("Login failed, no cookies returned");
  return cookies.split(", ").map(c => c.split(";")[0]).join("; ");
}

async function run() {
  console.log("=== VERIFYING PASSWORD REUSE PREVENTION ===");
  
  const staffId = uuidv4();
  const adminId = uuidv4();
  
  try {
    // 1. Setup Test Users
    const initialPasswordHash = await bcrypt.hash("InitialPassword123!", 10);
    const adminPasswordHash = await bcrypt.hash("AdminPassword123!", 10);
    
    await db.batch([
      { sql: "INSERT INTO users (id, login_id, password_hash, role, name) VALUES (?, ?, ?, 'staff', 'Test Staff')", args: [staffId, 'test_staff_pw', initialPasswordHash] },
      { sql: "INSERT INTO users (id, login_id, password_hash, role, name) VALUES (?, ?, ?, 'admin', 'Test Admin')", args: [adminId, 'test_admin_pw', adminPasswordHash] },
    ]);
    
    console.log("Created test staff and admin users.");

    const staffCookie = await loginAndGetCookie("test_staff_pw", "InitialPassword123!");
    console.log("Logged in as staff.");

    // Helper to call change password
    const changePassword = async (currentPw, newPw, cookie) => {
      const res = await fetch("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cookie": cookie },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
      });
      return { status: res.status, body: await res.json() };
    };

    // 2. Set password A (Success Path)
    console.log("\n-> Testing Success Path (Set to PasswordA)");
    let res = await changePassword("InitialPassword123!", "PasswordA!", staffCookie);
    console.log(`Status: ${res.status}, Response:`, res.body);
    if (res.status !== 200) throw new Error("Failed to set PasswordA");
    
    // Update our local tracker for current password
    let currentStaffPassword = "PasswordA!";

    // 3. Try to set exact same password again (Self-service Change)
    console.log("\n-> Testing Self-Service Same Password (Set to PasswordA again)");
    res = await changePassword("PasswordA!", "PasswordA!", staffCookie);
    console.log(`Status: ${res.status}, Response:`, res.body);
    if (res.status !== 400 || res.body.error !== "This password has been used before, please choose a different one") {
      throw new Error("Failed to reject same password reuse");
    }

    // 4. Change to Password B
    console.log("\n-> Testing Change to PasswordB");
    res = await changePassword("PasswordA!", "PasswordB!", staffCookie);
    console.log(`Status: ${res.status}, Response:`, res.body);
    if (res.status !== 200) throw new Error("Failed to set PasswordB");
    currentStaffPassword = "PasswordB!";

    // 5. Try to change back to Password A (Historical check)
    console.log("\n-> Testing Historical Password Reuse (Set back to PasswordA)");
    res = await changePassword("PasswordB!", "PasswordA!", staffCookie);
    console.log(`Status: ${res.status}, Response:`, res.body);
    if (res.status !== 400 || res.body.error !== "This password has been used before, please choose a different one") {
      throw new Error("Failed to reject historical password reuse");
    }

    // 6. Admin Reset Check
    const adminCookie = await loginAndGetCookie("test_admin_pw", "AdminPassword123!");
    console.log("\nLogged in as admin.");
    
    const adminReset = async (newPw, cookie) => {
      const res = await fetch("http://localhost:3000/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cookie": cookie },
        body: JSON.stringify({ userId: staffId, newLoginId: "test_staff_pw", newPassword: newPw, requirePasswordChange: true })
      });
      return { status: res.status, body: await res.json() };
    };

    console.log("\n-> Testing Admin Reset to Used Password (Set to PasswordA)");
    res = await adminReset("PasswordA!", adminCookie);
    console.log(`Status: ${res.status}, Response:`, res.body);
    if (res.status !== 400 || res.body.error !== "This password has been used before, please choose a different one") {
      throw new Error("Admin reset failed to reject historical password reuse");
    }
    
    console.log("\n-> Testing Admin Reset to Current Password (Set to PasswordB)");
    res = await adminReset("PasswordB!", adminCookie);
    console.log(`Status: ${res.status}, Response:`, res.body);
    if (res.status !== 400 || res.body.error !== "This password has been used before, please choose a different one") {
      throw new Error("Admin reset failed to reject current password reuse");
    }

    console.log("\n-> Testing Admin Reset to Genuinely New Password (Set to PasswordC)");
    res = await adminReset("PasswordC!", adminCookie);
    console.log(`Status: ${res.status}, Response:`, res.body);
    if (res.status !== 200) {
      throw new Error("Admin reset failed to accept new password");
    }

    console.log("\n✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY");

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    // Cleanup
    await db.execute({ sql: "DELETE FROM users WHERE id IN (?, ?)", args: [staffId, adminId] });
    console.log("\nCleaned up test users.");
  }
}

run();
