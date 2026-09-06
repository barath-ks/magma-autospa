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
  console.log("=== VERIFYING NOTIFICATION BADGES END-TO-END ===");
  
  const staffId = uuidv4();
  const managerId = uuidv4();
  const otherManagerId = uuidv4();
  const otherBranchId = 'branch-2'; // Assumes branch-2 exists
  
  try {
    const passwordHash = await bcrypt.hash("Password123!", 10);
    
    // Create staff & manager in branch-1
    await db.batch([
      { sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, 'staff', 'Badge Staff', 'branch-1')", args: [staffId, 'badge_staff', passwordHash] },
      { sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, 'manager', 'Badge Mgr', 'branch-1')", args: [managerId, 'badge_mgr', passwordHash] },
      { sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, 'manager', 'Other Mgr', ?)", args: [otherManagerId, 'badge_other_mgr', passwordHash, otherBranchId] }
    ]);

    const staffCookie = await loginAndGetCookie("badge_staff", "Password123!");
    const mgrCookie = await loginAndGetCookie("badge_mgr", "Password123!");
    const otherMgrCookie = await loginAndGetCookie("badge_other_mgr", "Password123!");

    // Helpers
    const getBadges = async (cookie) => {
      const res = await fetch("http://localhost:3000/api/notifications", { headers: { "Cookie": cookie } });
      return await res.json();
    };

    // 0. Initial state
    let mgrBadges = await getBadges(mgrCookie);
    const initialCount = mgrBadges.managerScheduleBadge;
    console.log(`Initial Manager pending count: ${initialCount}`);

    // 1. Staff submits request
    const d3 = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const d3_local = new Date(d3.getTime() - d3.getTimezoneOffset() * 60000);
    const reqRes = await fetch("http://localhost:3000/api/staff/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": staffCookie },
      body: JSON.stringify({ requested_date: d3_local.toISOString().split('T')[0], start_time: "10:00", end_time: "17:00" })
    });
    const { id: shiftId } = await reqRes.json();
    console.log("Staff submitted a new shift request.");

    // Verify Manager Badge
    mgrBadges = await getBadges(mgrCookie);
    if (mgrBadges.managerScheduleBadge !== initialCount + 1) {
      throw new Error(`Manager badge count did not increase by 1. Expected ${initialCount + 1}, got ${mgrBadges.managerScheduleBadge}`);
    }
    console.log("✅ Manager badge count correctly increased by 1.");

    // Verify Other Manager Badge (Branch isolation)
    const otherMgrBadges = await getBadges(otherMgrCookie);
    console.log(`Other manager pending count (different branch): ${otherMgrBadges.managerScheduleBadge}`);

    // 2. Manager Approves Request
    await fetch("http://localhost:3000/api/manager/schedule", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Cookie": mgrCookie },
      body: JSON.stringify({ id: shiftId, status: "approved" })
    });
    console.log("Manager approved the request.");

    // Verify Staff Badge Appeared
    let staffBadges = await getBadges(staffCookie);
    if (staffBadges.staffScheduleBadge !== 1) {
      throw new Error(`Staff badge should be 1, got ${staffBadges.staffScheduleBadge}`);
    }
    console.log("✅ Staff badge correctly appeared (count=1).");

    // 3. Staff visits schedule page (fetches GET /api/staff/schedule)
    await fetch("http://localhost:3000/api/staff/schedule", {
      headers: { "Cookie": staffCookie }
    });
    console.log("Staff visited schedule page.");

    // Verify Staff Badge Cleared
    staffBadges = await getBadges(staffCookie);
    if (staffBadges.staffScheduleBadge !== 0) {
      throw new Error(`Staff badge should have cleared to 0, got ${staffBadges.staffScheduleBadge}`);
    }
    console.log("✅ Staff badge correctly cleared after viewing.");

    console.log("\n✅ ALL VERIFICATIONS PASSED");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
  } finally {
    // Cleanup
    await db.execute({ sql: "DELETE FROM users WHERE id IN (?, ?, ?)", args: [staffId, managerId, otherManagerId] });
    console.log("\nCleaned up test users.");
  }
}

run();
