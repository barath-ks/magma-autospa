import { db } from "../lib/db";
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
  // We need to collect all cookies (next-auth.csrf-token, next-auth.session-token, etc)
  const cookieHeader = cookies.map(c => c.split(";")[0]).join("; ");
  return cookieHeader;
}

async function run() {
  console.log("Setting up E2E verification...");

  // 1. Create a dummy job in branch-1
  const jobId = uuidv4();
  await db.execute({
    sql: "INSERT INTO transactions (id, customer_id, branch_id, total_amount, points_awarded, status) VALUES (?, (SELECT id FROM customers LIMIT 1), 'branch-1', 100, 10, 'pending')",
    args: [jobId]
  });
  console.log(`Created Job ID: ${jobId}`);

  const cookieA = await login("test_staff_a"); // Branch 1
  const cookieB = await login("test_staff_b"); // Branch 1
  const cookieC = await login("test_staff_c"); // Branch 2
  const cookieM = await login("test_manager"); // Branch 1 Manager

  console.log("\\n--- 1. branch-mismatch 403 ---");
  const res1 = await fetch("http://localhost:3000/api/staff/jobs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Cookie": cookieC },
    body: JSON.stringify({ id: jobId, status: "in_progress" })
  });
  console.log("Status:", res1.status);
  console.log("Response:", await res1.json());

  console.log("\\n--- 2. staff_id assignment confirmation and claimed_at ---");
  const res2 = await fetch("http://localhost:3000/api/staff/jobs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Cookie": cookieA },
    body: JSON.stringify({ id: jobId, status: "in_progress" })
  });
  console.log("Status:", res2.status);
  const data2 = await res2.json();
  console.log("Response:", data2);
  
  const dbCheck1 = await db.execute({ sql: "SELECT staff_id, claimed_at, finished_at FROM transactions WHERE id = ?", args: [jobId] });
  console.log("DB staff_id:", dbCheck1.rows[0].staff_id, " (Expected: assigned to Staff A)");
  console.log("DB claimed_at:", dbCheck1.rows[0].claimed_at, " (Expected: valid timestamp)");
  console.log("DB finished_at:", dbCheck1.rows[0].finished_at, " (Expected: null)");
  
  const originalClaimedAt = dbCheck1.rows[0].claimed_at;

  console.log("\\n--- 3. same-branch-different-staff 403 ---");
  const res3 = await fetch("http://localhost:3000/api/staff/jobs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Cookie": cookieB },
    body: JSON.stringify({ id: jobId, status: "finished" })
  });
  console.log("Status:", res3.status);
  console.log("Response:", await res3.json());

  console.log("\\n--- 4. manager override success and finished_at ---");
  const res4 = await fetch("http://localhost:3000/api/staff/jobs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Cookie": cookieM },
    body: JSON.stringify({ id: jobId, status: "finished" })
  });
  console.log("Status:", res4.status);
  console.log("Response:", await res4.json());

  const dbCheck2 = await db.execute({ sql: "SELECT claimed_at, finished_at FROM transactions WHERE id = ?", args: [jobId] });
  console.log("DB claimed_at:", dbCheck2.rows[0].claimed_at, " (Expected:", originalClaimedAt, ")");
  console.log("DB finished_at:", dbCheck2.rows[0].finished_at, " (Expected: valid timestamp)");

  console.log("\\n--- 5. finished-job exclusion from active list ---");
  const res5 = await fetch("http://localhost:3000/api/staff/jobs", {
    headers: { "Cookie": cookieA }
  });
  const data5 = await res5.json();
  const found = data5.jobs.find((j: any) => j.id === jobId);
  console.log("Is job in active list?", !!found);
}

run();
