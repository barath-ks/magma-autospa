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
  console.log("=== VERIFYING ADD NEW WORK WIZARD ===");
  const staffId = uuidv4();
  const branchBStaffId = uuidv4();
  
  try {
    const passwordHash = await bcrypt.hash("Password123!", 10);
    await db.batch([
      { sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, 'staff', 'Staff A', 'branch-1')", args: [staffId, 'staff_a', passwordHash] },
      { sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, 'staff', 'Staff B', 'branch-2')", args: [branchBStaffId, 'staff_b', passwordHash] }
    ], "write");

    const staffCookie = await loginAndGetCookie("staff_a", "Password123!");

    // 1. Verify required email block inline
    console.log("\n--- Testing Email Validation ---");
    const noEmailRes = await fetch("http://localhost:3000/api/staff/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": staffCookie },
      body: JSON.stringify({ name: "No Email Guy", phone: "555-NOEM" })
    });
    console.log("Status without email:", noEmailRes.status);
    console.log("Response:", await noEmailRes.text());

    // 2. Inline Customer Creation success
    console.log("\n--- Testing Inline Customer Creation ---");
    const createRes = await fetch("http://localhost:3000/api/staff/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": staffCookie },
      body: JSON.stringify({ name: "Wizard Client", phone: "555-WIZARD", email: "wizard@example.com" })
    });
    const customerData = await createRes.json();
    if (!createRes.ok) throw new Error("Failed to create customer");
    console.log("Successfully created customer inline:", customerData.id);

    // Get an active service
    const serviceRes = await db.execute("SELECT id FROM services WHERE is_active = 1 LIMIT 1");
    const serviceId = serviceRes.rows[0].id;

    // 3. Verify cross-branch assignment block (403)
    console.log("\n--- Testing Cross-Branch Assignment Block ---");
    const assignBlockRes = await fetch("http://localhost:3000/api/staff/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": staffCookie },
      body: JSON.stringify({
        customer_id: customerData.id,
        service_ids: [serviceId],
        assigned_to: branchBStaffId // Staff from branch 2
      })
    });
    console.log("Status assigning to cross-branch staff:", assignBlockRes.status);
    console.log("Response:", await assignBlockRes.text());

    // 4. Verify successful transaction creation with assignment
    console.log("\n--- Testing Successful Transaction Link ---");
    const txRes = await fetch("http://localhost:3000/api/staff/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": staffCookie },
      body: JSON.stringify({
        customer_id: customerData.id,
        service_ids: [serviceId],
        assigned_to: staffId // Assign to self
      })
    });
    const txData = await txRes.json();
    console.log("Status creating tx:", txRes.status);
    if (!txRes.ok) throw new Error("Failed to create tx");
    console.log("Successfully created transaction:", txData.id);

    // Verify it's in the queue
    const getRes = await fetch("http://localhost:3000/api/staff/jobs", { headers: { "Cookie": staffCookie } });
    const getData = await getRes.json();
    const job = getData.jobs.find(j => j.id === txData.id);
    if (!job) throw new Error("Transaction not found in queue");
    console.log("✅ Verified job in queue with assigned_staff_id:", job.assigned_staff_id === staffId);
    
  } finally {
    await db.execute({ sql: "DELETE FROM users WHERE id IN (?, ?)", args: [staffId, branchBStaffId] });
  }
}
run();
