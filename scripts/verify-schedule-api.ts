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
  console.log("=== VERIFYING END-TO-END STAFF SCHEDULE API ===");
  
  const staffId = uuidv4();
  
  try {
    // 1. Setup Test User
    const passwordHash = await bcrypt.hash("Password123!", 10);
    
    await db.execute({ 
      sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, 'staff', 'Test Staff Schedule', 'branch-1')", 
      args: [staffId, 'test_schedule_staff', passwordHash] 
    });
    
    console.log("Created test staff user.");

    const staffCookie = await loginAndGetCookie("test_schedule_staff", "Password123!");
    console.log("Logged in as staff.");

    // Helper to call create shift request
    const requestShift = async (reqDate, startTime, endTime) => {
      const res = await fetch("http://localhost:3000/api/staff/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cookie": staffCookie },
        body: JSON.stringify({ requested_date: reqDate, start_time: startTime, end_time: endTime })
      });
      return { status: res.status, body: await res.json() };
    };

    // 2. Submit shift for 1 hour from now
    const now = new Date();
    const d1 = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hr from now
    const d1_local = new Date(d1.getTime() - d1.getTimezoneOffset() * 60000);
    const reqDate1 = d1_local.toISOString().split('T')[0];
    const startTime1 = d1_local.toISOString().split('T')[1].substring(0,5);
    
    console.log(`\n-> Testing Shift Request for 1 hour from now (${reqDate1} ${startTime1})`);
    let res = await requestShift(reqDate1, startTime1, "17:00");
    console.log(`Status: ${res.status}, Response:`, res.body);
    if (res.status !== 400 || res.body.error !== "Shift requests must be submitted at least 24 hours in advance") {
      throw new Error("API failed to block shift request 1 hour away");
    }
    console.log("✅ correctly blocked with 400 status!");

    // 3. Submit shift for 25 hours from now
    const d3 = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 hr from now
    const d3_local = new Date(d3.getTime() - d3.getTimezoneOffset() * 60000);
    const reqDate3 = d3_local.toISOString().split('T')[0];
    const startTime3 = d3_local.toISOString().split('T')[1].substring(0,5);
    
    console.log(`\n-> Testing Shift Request for 25 hours from now (${reqDate3} ${startTime3})`);
    res = await requestShift(reqDate3, startTime3, "17:00");
    console.log(`Status: ${res.status}, Response:`, res.body);
    if (res.status !== 200 || !res.body.success) {
      throw new Error("API failed to accept shift request 25 hours away");
    }
    console.log("✅ correctly accepted with 200 status!");

    console.log("\n✅ ALL END-TO-END VERIFICATION TESTS PASSED");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
  } finally {
    // Cleanup
    await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [staffId] });
    console.log("\nCleaned up test user.");
  }
}

run();
