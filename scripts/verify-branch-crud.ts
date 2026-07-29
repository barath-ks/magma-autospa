import { db } from "../lib/db";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

// Override next-auth for testing
const mockGetServerSession = require("next-auth/next");
mockGetServerSession.getServerSession = async (authOptions: any) => (global as any).testSession;

// Import Route Handlers after mock
const branchesRoute = require("../app/api/admin/branches/route");
const branchesPATCHRoute = require("../app/api/admin/branches/[id]/route");

const branchesGET = branchesRoute.GET;
const branchesPOST = branchesRoute.POST;
const branchesPATCH = branchesPATCHRoute.PATCH;

async function mockSession(role: string) {
  return {
    user: { id: "test-user-id", role }
  };
}

async function run() {
  console.log("Setting up E2E verification for Branch CRUD...\n");
  
  const testBranchId = uuidv4();

  // --- 1. Authorization Matrix ---
  console.log("--- 1. Authorization Matrix (Expect 403s for non-Admins) ---");
  (global as any).testSession = await mockSession("manager");
  
  // GET
  const getReq = new Request("http://localhost:3000/api/admin/branches");
  const getRes = await branchesGET(getReq);
  console.log("Manager GET status:", getRes.status);
  if (getRes.status !== 403) throw new Error("Expected 403 on GET");

  // POST
  const postReq = new Request("http://localhost:3000/api/admin/branches", {
    method: "POST",
    body: JSON.stringify({ name: "Hacker Branch", location: "Void", manager_name: "Hacker" })
  });
  const postRes = await branchesPOST(postReq);
  console.log("Manager POST status:", postRes.status);
  if (postRes.status !== 403) throw new Error("Expected 403 on POST");

  // PATCH
  const patchReq = new Request(`http://localhost:3000/api/admin/branches/${testBranchId}`, {
    method: "PATCH",
    body: JSON.stringify({ name: "Hacker Edited" })
  });
  const patchRes = await branchesPATCH(patchReq, { params: Promise.resolve({ id: testBranchId }) });
  console.log("Manager PATCH status:", patchRes.status);
  if (patchRes.status !== 403) throw new Error("Expected 403 on PATCH");

  // --- 2. Admin Branch Creation ---
  console.log("\n--- 2. Admin Branch Creation ---");
  (global as any).testSession = await mockSession("admin");
  const uniqueBranchName = "Test Branch " + Date.now();
  
  const createReq = new Request("http://localhost:3000/api/admin/branches", {
    method: "POST",
    body: JSON.stringify({ 
      name: uniqueBranchName, 
      location: "123 Main St", 
      manager_name: "John Doe",
      manager_phone: "555-1234"
    })
  });
  
  const createRes = await branchesPOST(createReq);
  const createData = await createRes.json();
  console.log("Creation Response:", createRes.status, createData.success ? "Success" : "Failed");
  
  if (!createRes.ok || !createData.success) throw new Error("Failed to create branch");
  const newBranchId = createData.branch.id;
  const managerCredentials = createData.manager;
  
  console.log("Returned Manager Credentials:");
  console.log("Login ID:", managerCredentials.login_id);
  console.log("Password:", managerCredentials.temp_password);

  // --- 3. Duplication Guardrails ---
  console.log("\n--- 3. Duplication Guardrails ---");
  const duplicateReq = new Request("http://localhost:3000/api/admin/branches", {
    method: "POST",
    body: JSON.stringify({ 
      name: uniqueBranchName, 
      location: "Somewhere else", 
      manager_name: "Jane Doe"
    })
  });
  const duplicateRes = await branchesPOST(duplicateReq);
  console.log("Duplicate Creation Status:", duplicateRes.status);
  const dupData = await duplicateRes.json();
  console.log("Duplicate Error message:", dupData.error);
  if (duplicateRes.status !== 400) throw new Error("Expected 400 on duplicate branch name");

  // --- 4. Branch Isolation (PATCH) ---
  console.log("\n--- 4. Branch Isolation & Edit ---");
  const newLocation = "456 Edit Ave";
  const editReq = new Request(`http://localhost:3000/api/admin/branches/${newBranchId}`, {
    method: "PATCH",
    body: JSON.stringify({ name: uniqueBranchName + " Edited", location: newLocation })
  });
  const editRes = await branchesPATCH(editReq, { params: Promise.resolve({ id: newBranchId }) });
  console.log("Edit Status:", editRes.status);
  if (!editRes.ok) throw new Error("Failed to edit branch");

  // Verify in DB
  const verifyDb = await db.execute({ sql: "SELECT location FROM branches WHERE id = ?", args: [newBranchId] });
  if (verifyDb.rows[0].location !== newLocation) throw new Error("Branch update did not persist to DB");
  console.log("PASS: Branch edited and isolated correctly.");

  // --- 5. End-to-End Manager Auth Check ---
  console.log("\n--- 5. E2E Manager Account Check ---");
  const userCheck = await db.execute({ sql: "SELECT password_hash, must_change_password FROM users WHERE login_id = ?", args: [managerCredentials.login_id] });
  if (userCheck.rows.length === 0) throw new Error("Manager account not found in DB");
  
  const userRow = userCheck.rows[0];
  if (userRow.must_change_password !== 1) throw new Error("must_change_password was not set to true!");
  
  const passwordMatch = await bcrypt.compare(managerCredentials.temp_password, userRow.password_hash as string);
  if (!passwordMatch) throw new Error("Returned temporary password does not match DB hash!");
  
  console.log("PASS: Manager account successfully provisioned. Hash matches. Forced password reset is flagged.");
  
  console.log("\nVerification complete!");
}

run().catch(console.error);
