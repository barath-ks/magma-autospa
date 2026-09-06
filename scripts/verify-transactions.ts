import { db } from "../lib/db";
const mockGetServerSession = require("next-auth/next");
import { v4 as uuidv4 } from "uuid";

// Import Route Handlers
const staffTransactionsRoute = require("../app/api/staff/transactions/route");
const staffJobsRoute = require("../app/api/staff/jobs/route");
const managerAnalyticsRoute = require("../app/api/manager/analytics/route");

async function mockSession(role: string, branch_id: string, user_id: string) {
  return {
    user: { id: user_id, role, branch_id }
  };
}

async function run() {
  console.log("Setting up Transactions CRUD verification...\n");
  mockGetServerSession.getServerSession = async () => (global as any).testSession;

  const branchId1 = uuidv4();
  const branchId2 = uuidv4();
  const staffId1 = uuidv4();
  const customerId = uuidv4();
  const managerId = uuidv4();

  // DB Setup
  await db.execute({ sql: "INSERT INTO branches (id, name, location) VALUES (?, ?, ?)", args: [branchId1, `Branch A ${Date.now()}`, "A"] });
  await db.execute({ sql: "INSERT INTO branches (id, name, location) VALUES (?, ?, ?)", args: [branchId2, `Branch B ${Date.now()}`, "B"] });
  
  await db.execute({ sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, ?, ?, ?)", args: [staffId1, `STAFF-A-${Date.now()}`, "hash", "staff", "Staff A", branchId1] });
  await db.execute({ sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, ?, ?, ?)", args: [managerId, `MGR-A-${Date.now()}`, "hash", "manager", "Manager A", branchId1] });
  
  await db.execute({ sql: "INSERT INTO customers (id, name, phone, points_balance, branch_id) VALUES (?, ?, ?, ?, ?)", args: [customerId, "Test Customer", `555-${Date.now()}`, 100, branchId1] });

  // Create Services
  const s1Id = uuidv4();
  const s2Id = uuidv4();
  const sInactiveId = uuidv4();

  await db.execute({ sql: "INSERT INTO services (id, name, price, points_earned, is_active) VALUES (?, ?, ?, ?, ?)", args: [s1Id, "Wash", 200, 20, 1] });
  await db.execute({ sql: "INSERT INTO services (id, name, price, points_earned, is_active) VALUES (?, ?, ?, ?, ?)", args: [s2Id, "Wax", 50, 5, 1] });
  await db.execute({ sql: "INSERT INTO services (id, name, price, points_earned, is_active) VALUES (?, ?, ?, ?, ?)", args: [sInactiveId, "Old Wash", 150, 15, 0] });

  (global as any).testSession = await mockSession("staff", branchId1, staffId1);

  console.log("=== 1. Validation Checks ===");
  const reqEmpty = new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ customer_id: customerId, service_ids: [] }) });
  const resEmpty = await staffTransactionsRoute.POST(reqEmpty);
  console.log("Empty Service IDs Status:", resEmpty.status);
  console.log("Empty Service IDs Response:", JSON.stringify(await resEmpty.json()));

  const reqInactive = new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ customer_id: customerId, service_ids: [s1Id, sInactiveId] }) });
  const resInactive = await staffTransactionsRoute.POST(reqInactive);
  console.log("Inactive Service Status:", resInactive.status);
  console.log("Inactive Service Response:", JSON.stringify(await resInactive.json()));


  console.log("\n=== 2. Creating Transaction (Duplicates Allowed) ===");
  // Check Manager Analytics beforehand
  (global as any).testSession = await mockSession("manager", branchId1, managerId);
  const reqAnalytics = new Request("http://localhost/api");
  let resAnalytics = await managerAnalyticsRoute.GET(reqAnalytics);
  const initialAnalytics = await resAnalytics.json();
  console.log("Manager Analytics Initial Revenue:", initialAnalytics.revenue);

  // Re-auth as staff
  (global as any).testSession = await mockSession("staff", branchId1, staffId1);

  // Test case: 1 Wash (200), 1 Wax (50) = 250 total. (Fractional 250/100 = 2.5 -> 2 points)
  // Let's use duplicate Wax: 150 Wash + 50 Wax + 50 Wax = 250.
  // Wait, Wash is 200. So 1 Wash + 1 Wax = 250. No duplicates if we just do that.
  // Let's change it to: 2x Wax (100) + 1x Old Wash (Inactive) -> wait, active only.
  // Let's just create a new service for 100. Or use 2x Wax (100) + 150 = 250. Let's do 1 Wash (200) + 1 Wax (50) = 250.
  // If we want duplicates, we can do 5x Wax (50 * 5 = 250).
  const reqCreate = new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ customer_id: customerId, service_ids: [s2Id, s2Id, s2Id, s2Id, s2Id] }) });
  const resCreate = await staffTransactionsRoute.POST(reqCreate);
  const createData = await resCreate.json();
  console.log("Create Status:", resCreate.status, "| Transaction ID:", createData.id);
  console.log("Calculated Total:", createData.total_amount, "(Expected: 250 from 5x 50 Wax)");
  console.log("Calculated Points Awarded stored in DB:", createData.points_awarded, "(Expected: 2)");

  const transactionId = createData.id;

  console.log("\n=== 2b. Queue Visibility (Branch 1) ===");
  const reqJobsB1 = new Request("http://localhost/api");
  const resJobsB1 = await staffJobsRoute.GET(reqJobsB1);
  const jobsB1Data = await resJobsB1.json();
  const foundJob = jobsB1Data.jobs.find((j: any) => j.id === transactionId);
  console.log(`Transaction ${transactionId} found in Branch A Queue?:`, !!foundJob);
  if (foundJob) {
      console.log("Job details in Queue:", JSON.stringify({ id: foundJob.id, status: foundJob.status, service_name: foundJob.service_name }));
  }


  console.log("\n=== 3. Claiming & Atomic Points Award ===");
  // Claim Job
  const reqClaim = new Request("http://localhost/api", { method: "PATCH", body: JSON.stringify({ id: transactionId, status: "in_progress" }) });
  await staffJobsRoute.PATCH(reqClaim);
  
  let customerDb = await db.execute({ sql: "SELECT points_balance FROM customers WHERE id = ?", args: [customerId] });
  console.log("Customer Points Balance after claim (Expected 100):", customerDb.rows[0].points_balance);

  // Finish Job
  const reqFinish = new Request("http://localhost/api", { method: "PATCH", body: JSON.stringify({ id: transactionId, status: "finished" }) });
  await staffJobsRoute.PATCH(reqFinish);

  customerDb = await db.execute({ sql: "SELECT points_balance FROM customers WHERE id = ?", args: [customerId] });
  console.log("Customer Points Balance after finish (Expected 104):", customerDb.rows[0].points_balance);

  // Check Manager Analytics afterwards
  (global as any).testSession = await mockSession("manager", branchId1, managerId);
  resAnalytics = await managerAnalyticsRoute.GET(reqAnalytics);
  const finalAnalytics = await resAnalytics.json();
  console.log("Manager Analytics Final Revenue (Expected Initial + 250):", finalAnalytics.revenue);

  console.log("\n=== 4. Branch Isolation & Visibility ===");
  // Staff fetching jobs on branch 2 shouldn't see anything.
  (global as any).testSession = await mockSession("staff", branchId2, uuidv4());
  const reqJobsB2 = new Request("http://localhost/api");
  const resJobsB2 = await staffJobsRoute.GET(reqJobsB2);
  const jobsB2 = await resJobsB2.json();
  console.log("Branch B Jobs Count:", jobsB2.jobs.length);

  // Manager fetching analytics on branch 2 shouldn't see the 250 revenue.
  (global as any).testSession = await mockSession("manager", branchId2, uuidv4());
  const reqAnalyticsB2 = new Request("http://localhost/api");
  const resAnalyticsB2 = await managerAnalyticsRoute.GET(reqAnalyticsB2);
  const analyticsB2 = await resAnalyticsB2.json();
  console.log("Branch B Analytics Revenue:", analyticsB2.revenue);

  console.log("\nVerification complete!");
}

run().catch(console.error);
