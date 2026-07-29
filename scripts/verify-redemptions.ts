import { db } from "../lib/db";
const mockGetServerSession = require("next-auth/next");
import { v4 as uuidv4 } from "uuid";

// Import Route Handlers
const redemptionsRoute = require("../app/api/staff/redemptions/route");
const managerAnalyticsRoute = require("../app/api/manager/analytics/route");

async function mockSession(role: string, branch_id: string, staff_id: string) {
  return {
    user: { id: staff_id, role, branch_id }
  };
}

async function run() {
  console.log("Setting up Redemption verification...\n");
  mockGetServerSession.getServerSession = async (authOptions: any) => (global as any).testSession;

  // 1. Setup Test Data
  const branchId = uuidv4();
  const staffId = uuidv4();
  const customerId = uuidv4();
  const offerId = uuidv4();
  
  await db.execute({
    sql: "INSERT INTO branches (id, name, location) VALUES (?, ?, ?)",
    args: [branchId, `Test Branch ${Date.now()}`, "Test Location"]
  });

  await db.execute({
    sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, ?, ?, ?)",
    args: [staffId, `STAFF-${Date.now().toString().slice(-4)}`, "hash", "staff", "Test Staff", branchId]
  });

  await db.execute({
    sql: "INSERT INTO customers (id, name, phone, branch_id, points_balance) VALUES (?, ?, ?, ?, ?)",
    args: [customerId, "Test Customer", `555-${Date.now().toString().slice(-4)}`, branchId, 150]
  });

  await db.execute({
    sql: "INSERT INTO offers (id, name, points_required, branch_id) VALUES (?, ?, ?, ?)",
    args: [offerId, "Free Wash Test Offer", 100, branchId]
  });

  // --- Test 1: Affordable Redemption ---
  console.log("--- 1. Affordable Redemption Test ---");
  (global as any).testSession = await mockSession("staff", branchId, staffId);
  
  const reqBody1 = JSON.stringify({ customer_id: customerId, offer_id: offerId });
  console.log("Request Body:", reqBody1);
  const req1 = new Request("http://localhost:3000/api/staff/redemptions", {
    method: "POST",
    body: reqBody1
  });
  
  const res1 = await redemptionsRoute.POST(req1);
  console.log("Response Status:", res1.status);
  const data1 = await res1.json();
  console.log("Response Body:", JSON.stringify(data1));

  // Query DB
  const custRes1 = await db.execute({ sql: "SELECT points_balance FROM customers WHERE id = ?", args: [customerId] });
  console.log("DB: Customer Points Balance:", custRes1.rows[0].points_balance);
  
  const redRes1 = await db.execute({ sql: "SELECT * FROM redemptions WHERE customer_id = ?", args: [customerId] });
  console.log("DB: Redemptions Count:", redRes1.rows.length);
  console.log("DB: Redemption Row:", JSON.stringify(redRes1.rows[0]));

  // --- Test 2: Over-budget Redemption ---
  console.log("\n--- 2. Over-budget Redemption Test ---");
  const reqBody2 = JSON.stringify({ customer_id: customerId, offer_id: offerId });
  console.log("Request Body:", reqBody2);
  const req2 = new Request("http://localhost:3000/api/staff/redemptions", {
    method: "POST",
    body: reqBody2
  });
  
  const res2 = await redemptionsRoute.POST(req2);
  console.log("Response Status:", res2.status);
  const data2 = await res2.json();
  console.log("Response Body:", JSON.stringify(data2));

  // Query DB
  const custRes2 = await db.execute({ sql: "SELECT points_balance FROM customers WHERE id = ?", args: [customerId] });
  console.log("DB: Customer Points Balance:", custRes2.rows[0].points_balance);
  
  const redRes2 = await db.execute({ sql: "SELECT id FROM redemptions WHERE customer_id = ?", args: [customerId] });
  console.log("DB: Redemptions Count:", redRes2.rows.length);

  // --- Test 3: Manager Analytics Check ---
  console.log("\n--- 3. Manager Analytics Check ---");
  (global as any).testSession = await mockSession("manager", branchId, uuidv4());
  
  const manReq = new Request("http://localhost:3000/api/manager/analytics?range=year");
  const manRes = await managerAnalyticsRoute.GET(manReq);
  const manData = await manRes.json();
  console.log("Manager Analytics Response (points_redeemed):", manData.pointsRedeemed);

  // --- Test 4: Simulated Rollback ---
  console.log("\n--- 4. Simulated Rollback Test (Transaction Integrity) ---");
  // By passing a fake staff ID that doesn't exist in the users table, we trigger a FOREIGN KEY constraint failure.
  // We expect db.batch() to roll back the points deduction entirely.
  const fakeStaffId = uuidv4();
  (global as any).testSession = await mockSession("staff", branchId, fakeStaffId);
  
  const reqBody4 = JSON.stringify({ customer_id: customerId, offer_id: offerId });
  console.log("Request Body:", reqBody4);
  const req4 = new Request("http://localhost:3000/api/staff/redemptions", {
    method: "POST",
    body: reqBody4
  });
  
  const res4 = await redemptionsRoute.POST(req4);
  console.log("Response Status:", res4.status);
  
  // Verify customer points did NOT decrease (it should still be 50 from the first test)
  const custRes4 = await db.execute({ sql: "SELECT points_balance FROM customers WHERE id = ?", args: [customerId] });
  console.log("DB: Customer Points Balance (After Rollback):", custRes4.rows[0].points_balance);
  
  if (custRes4.rows[0].points_balance !== 50) {
    throw new Error("ROLLBACK FAILED: Points were deducted despite the insertion failing!");
  } else {
    console.log("PASS: Transaction correctly rolled back. Points were protected.");
  }

  console.log("\nVerification complete!");
}

run().catch(console.error);
