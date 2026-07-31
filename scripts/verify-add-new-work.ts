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
  console.log("=== VERIFYING ADD NEW WORK API ===");
  
  const staffId = uuidv4();
  
  try {
    const passwordHash = await bcrypt.hash("Password123!", 10);
    await db.execute({ 
      sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, 'staff', 'Test Staff New Work', 'branch-1')", 
      args: [staffId, 'test_new_work_staff', passwordHash] 
    });
    console.log("Created test staff user.");

    const staffCookie = await loginAndGetCookie("test_new_work_staff", "Password123!");
    console.log("Logged in as staff.");

    // Fetch form data
    const formDataRes = await fetch("http://localhost:3000/api/staff/jobs/form-data", { headers: { "Cookie": staffCookie } });
    const formData = await formDataRes.json();
    console.log(`Fetched form data: ${formData.services.length} services, ${formData.staff.length} staff members`);
    
    if (formData.services.length === 0) throw new Error("No active services found to test with");
    const serviceId = formData.services[0].id;

    // POST new job
    const postRes = await fetch("http://localhost:3000/api/staff/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": staffCookie },
      body: JSON.stringify({
        vehicle_make: "Tesla Model S",
        vehicle_plate: "ELON-123",
        service_id: serviceId,
        assigned_to: "", // unassigned
        customer_name: "Elon Musk",
        customer_phone: "555-1234"
      })
    });
    
    const postData = await postRes.json();
    if (!postData.success) {
      throw new Error(`Failed to create job: ${JSON.stringify(postData)}`);
    }
    const transactionId = postData.transaction_id;
    console.log(`✅ Successfully created new job: ${transactionId}`);

    // GET jobs and verify it's there
    const getRes = await fetch("http://localhost:3000/api/staff/jobs", { headers: { "Cookie": staffCookie } });
    const getData = await getRes.json();
    const job = getData.jobs.find(j => j.id === transactionId);
    if (!job) throw new Error("Newly created job not found in GET response");
    if (job.status !== "pending") throw new Error(`Expected status 'pending', got '${job.status}'`);
    if (job.claimed_at !== null) throw new Error(`Expected claimed_at to be null, got '${job.claimed_at}'`);
    console.log(`✅ Job verified in queue with 'pending' status and null claimed_at`);

    // PATCH job to in_progress (Claiming it)
    const patchRes = await fetch("http://localhost:3000/api/staff/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Cookie": staffCookie },
      body: JSON.stringify({ id: transactionId, status: "in_progress" })
    });
    const patchData = await patchRes.json();
    if (!patchData.success) throw new Error(`Failed to claim job: ${JSON.stringify(patchData)}`);
    console.log("✅ Successfully claimed job via PATCH");

    // GET again and verify claimed_at is set
    const getRes2 = await fetch("http://localhost:3000/api/staff/jobs", { headers: { "Cookie": staffCookie } });
    const getData2 = await getRes2.json();
    const job2 = getData2.jobs.find(j => j.id === transactionId);
    if (job2.status !== "in_progress") throw new Error(`Expected status 'in_progress', got '${job2.status}'`);
    if (job2.claimed_at === null) throw new Error(`Expected claimed_at to be set, but it was null`);
    console.log(`✅ Job claimed_at properly updated to: ${job2.claimed_at}`);

    console.log("\n✅ ALL END-TO-END VERIFICATION TESTS PASSED");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
  } finally {
    await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [staffId] });
    console.log("\nCleaned up test user.");
  }
}

run();
