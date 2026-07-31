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

async function changePassword(cookie, currentPassword, newPassword) {
  const res = await fetch("http://localhost:3000/api/auth/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": cookie
    },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  console.log("=== VERIFYING PASSWORD STRENGTH REQUIREMENTS ===");

  const userId = uuidv4();
  
  try {
    const currentPw = "OldPassword123!";
    const hashed = await bcrypt.hash(currentPw, 10);
    
    await db.execute({
      sql: "INSERT INTO users (id, login_id, password_hash, role, name) VALUES (?, ?, ?, 'staff', 'Strength Test User')",
      args: [userId, 'strength_test_user', hashed]
    });
    
    console.log("Created test user. Logging in...");
    const cookie = await loginAndGetCookie("strength_test_user", currentPw);
    
    console.log("\n-> Testing < 8 characters ('Abc1!')");
    const res1 = await changePassword(cookie, currentPw, "Abc1!");
    console.log(`Status: ${res1.status}, Response:`, res1.data);
    if (res1.status !== 400 || res1.data.success) throw new Error("Test failed: Should have rejected short password.");
    
    console.log("\n-> Testing no numbers ('Password!')");
    const res2 = await changePassword(cookie, currentPw, "Password!");
    console.log(`Status: ${res2.status}, Response:`, res2.data);
    if (res2.status !== 400 || res2.data.success) throw new Error("Test failed: Should have rejected password without numbers.");
    
    console.log("\n-> Testing no special characters ('Password123')");
    const res3 = await changePassword(cookie, currentPw, "Password123");
    console.log(`Status: ${res3.status}, Response:`, res3.data);
    if (res3.status !== 400 || res3.data.success) throw new Error("Test failed: Should have rejected password without special chars.");
    
    console.log("\n-> Testing valid password ('Password123!')");
    const res4 = await changePassword(cookie, currentPw, "Password123!");
    console.log(`Status: ${res4.status}, Response:`, res4.data);
    if (res4.status !== 200 || !res4.data.success) throw new Error("Test failed: Should have accepted valid password.");
    
    console.log("\n✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY");

  } catch (e) {
    console.error("Test failed:", e);
  } finally {
    await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [userId] });
    await db.execute({ sql: "DELETE FROM password_history WHERE user_id = ?", args: [userId] });
    console.log("\nCleaned up test user.");
  }
}

run();
