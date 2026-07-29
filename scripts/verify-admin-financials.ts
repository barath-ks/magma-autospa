import { db } from "../lib/db";
import { v4 as uuidv4 } from "uuid";

async function mockSession(role: string, branchId?: string) {
  return {
    user: { id: "test-user-id", role, branch_id: branchId }
  };
}

// Override next-auth for testing
const mockGetServerSession = require("next-auth/next");
mockGetServerSession.getServerSession = async (authOptions: any) => global.testSession;

// Now require the APIs
import { GET as adminFinancialsGET } from "../app/api/admin/branch-financials/route";
import { GET as managerAnalyticsGET } from "../app/api/manager/analytics/route";
import { GET as managerExpensesGET } from "../app/api/manager/expenses/route";

async function run() {
  console.log("Setting up E2E verification for Admin Financials...\n");

  // Get a branch to test
  const branchRes = await db.execute({ sql: "SELECT id FROM branches LIMIT 1", args: [] });
  if (branchRes.rows.length === 0) {
    console.log("No branches found. Creating one...");
    const newBranchId = uuidv4();
    await db.execute({ sql: "INSERT INTO branches (id, name, address, phone) VALUES (?, ?, ?, ?)", args: [newBranchId, "Test Branch", "123 Test", "555-5555"] });
    branchRes.rows.push({ id: newBranchId });
  }
  const branchId = branchRes.rows[0].id as string;

  // Ensure foreign keys exist
  await db.execute({ sql: "INSERT OR IGNORE INTO customers (id, phone, name, branch_id) VALUES (?, ?, ?, ?)", args: ["cust-test", "000-0000", "Test Customer", branchId] });
  await db.execute({ sql: "INSERT OR IGNORE INTO users (id, login_id, password_hash, role, name) VALUES (?, ?, ?, ?, ?)", args: ["manager-1", "mgr-test", "hash", "manager", "Test Manager"] });

  // Insert a transaction and an expense for this branch to ensure non-zero values
  await db.execute({ sql: "INSERT INTO transactions (id, branch_id, customer_id, total_amount, points_awarded, status, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))", args: [uuidv4(), branchId, "cust-test", 100, 10, "finished"] });
  await db.execute({ sql: "INSERT INTO branch_expenses (id, branch_id, description, amount, entered_by, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))", args: [uuidv4(), branchId, "Initial Supplies", 20, "manager-1"] });

  // 1. Manager Role test (should 403)
  console.log("--- 1. Manager Role Access ---");
  (global as any).testSession = await mockSession("manager", branchId);
  const managerReq = new Request("http://localhost:3000/api/admin/branch-financials?range=month");
  const managerRes = await adminFinancialsGET(managerReq);
  console.log("Manager GET status:", managerRes.status);
  if (managerRes.status !== 403) throw new Error("Expected 403 for Manager");

  // 2. Staff Role test (should 403)
  console.log("\n--- 2. Staff Role Access ---");
  (global as any).testSession = await mockSession("staff", branchId);
  const staffReq = new Request("http://localhost:3000/api/admin/branch-financials?range=month");
  const staffRes = await adminFinancialsGET(staffReq);
  console.log("Staff GET status:", staffRes.status);
  if (staffRes.status !== 403) throw new Error("Expected 403 for Staff");

  // 3. Admin Role Data Consistency
  console.log("\n--- 3. Admin Data Consistency ---");
  (global as any).testSession = await mockSession("admin", branchId);
  const adminReq = new Request("http://localhost:3000/api/admin/branch-financials?range=month");
  const adminRes = await adminFinancialsGET(adminReq);
  const adminData = await adminRes.json();
  const testBranchFinancials = adminData.financials.find((b: any) => b.branch_id === branchId);
  
  if (!testBranchFinancials) throw new Error("Test branch not found in Admin payload");
  
  console.log("Admin payload for test branch:", testBranchFinancials);

  // Cross-check with Manager APIs
  (global as any).testSession = await mockSession("manager", branchId);
  const manAnalReq = new Request("http://localhost:3000/api/manager/analytics?range=month");
  const manAnalRes = await managerAnalyticsGET(manAnalReq);
  const manAnalData = await manAnalRes.json();
  
  const manExpReq = new Request("http://localhost:3000/api/manager/expenses?range=month");
  const manExpRes = await managerExpensesGET(manExpReq);
  const manExpData = await manExpRes.json();

  console.log("Manager Analytics Revenue:", manAnalData.revenue);
  console.log("Manager Analytics Expense:", manExpData.totalSum);

  if (testBranchFinancials.revenue !== manAnalData.revenue) {
    throw new Error(`Revenue mismatch: Admin(${testBranchFinancials.revenue}) vs Manager(${manAnalData.revenue})`);
  }
  if (testBranchFinancials.expense !== manExpData.totalSum) {
    throw new Error(`Expense mismatch: Admin(${testBranchFinancials.expense}) vs Manager(${manExpData.totalSum})`);
  }
  console.log("PASS: Revenue and Expenses exactly match between Admin and Manager endpoints.");

  // 4. Loss Scenario
  console.log("\n--- 4. Loss Scenario (Negative Profit) ---");
  // Insert a huge expense so expense > revenue
  const hugeExpenseAmount = manAnalData.revenue + 1000;
  await db.execute({ sql: "INSERT INTO branch_expenses (id, branch_id, description, amount, entered_by, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))", args: [uuidv4(), branchId, "Massive Loss Event", hugeExpenseAmount, "manager-1"] });

  (global as any).testSession = await mockSession("admin", branchId);
  const lossReq = new Request("http://localhost:3000/api/admin/branch-financials?range=month");
  const lossRes = await adminFinancialsGET(lossReq);
  const lossData = await lossRes.json();
  const lossBranch = lossData.financials.find((b: any) => b.branch_id === branchId);

  console.log("Updated Admin payload for test branch:", lossBranch);
  
  if (lossBranch.profit >= 0) {
    throw new Error(`Expected negative profit, got: ${lossBranch.profit}`);
  }
  console.log("PASS: Negative profit calculated correctly.");
  
  console.log("\nVerification complete.");
}

run().catch(console.error);
