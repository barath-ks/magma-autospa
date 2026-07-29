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
  const cookieHeader = cookies.map(c => c.split(";")[0]).join("; ");
  return cookieHeader;
}

async function run() {
  console.log("Setting up E2E verification for Manager Jobs...");

  // Insert a dummy job into branch-2
  const branch2JobId = uuidv4();
  await db.execute({
    sql: "INSERT INTO transactions (id, customer_id, branch_id, total_amount, points_awarded, status, created_at) VALUES (?, (SELECT id FROM customers LIMIT 1), 'branch-2', 100, 10, 'pending', CURRENT_TIMESTAMP)",
    args: [branch2JobId]
  });
  
  // Insert a dummy job into branch-1
  const branch1JobId = uuidv4();
  await db.execute({
    sql: "INSERT INTO transactions (id, customer_id, branch_id, total_amount, points_awarded, status, created_at, claimed_at, finished_at) VALUES (?, (SELECT id FROM customers LIMIT 1), 'branch-1', 100, 10, 'finished', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    args: [branch1JobId]
  });

  console.log("Dummy jobs inserted.");

  const cookieManager1 = await login("test_manager"); // Branch 1

  console.log("\\n--- 1. Fetching Manager Jobs ---");
  const res = await fetch("http://localhost:3000/api/manager/jobs?range=month&page=1", {
    headers: { "Cookie": cookieManager1 }
  });
  const data = await res.json();
  
  if (!res.ok) {
    console.error("Failed to fetch jobs", data);
    return;
  }
  
  const jobs = data.jobs;
  console.log(`Successfully fetched ${jobs.length} jobs.`);

  console.log("\\n--- 2. Verifying Branch Scoping ---");
  const foundBranch2 = jobs.find((j: any) => j.id === branch2JobId);
  if (foundBranch2) {
    console.error("FAIL: Job from branch-2 leaked to branch-1 manager!");
  } else {
    console.log("PASS: Job from branch-2 did not leak.");
  }
  
  const foundBranch1 = jobs.find((j: any) => j.id === branch1JobId);
  if (!foundBranch1) {
    console.error("FAIL: Expected job from branch-1 was not found.");
  } else {
    console.log("PASS: Expected job from branch-1 found.");
  }

  console.log("\\n--- 3. Verifying Timestamps ---");
  if (foundBranch1) {
    console.log("created_at:", foundBranch1.created_at);
    console.log("claimed_at:", foundBranch1.claimed_at);
    console.log("finished_at:", foundBranch1.finished_at);
    
    if (foundBranch1.created_at && foundBranch1.claimed_at && foundBranch1.finished_at) {
      console.log("PASS: All timestamps present and populated.");
    } else {
      console.error("FAIL: Missing timestamps.");
    }
  }
  
  console.log("\\nE2E verification completed.");
}

run();
