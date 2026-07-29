import { db } from "../lib/db";
const mockGetServerSession = require("next-auth/next");

// Import Route Handlers
const branchesIdRoute = require("../app/api/admin/branches/[id]/route");
const branchFinancialsRoute = require("../app/api/admin/branch-financials/route");

async function mockSession(role: string) {
  return {
    user: { id: "test-user-id", role }
  };
}

async function run() {
  console.log("Setting up E2E verification for Financial Restructure...\n");
  mockGetServerSession.getServerSession = async (authOptions: any) => (global as any).testSession;

  const branchRes = await db.execute({ sql: "SELECT id FROM branches LIMIT 1", args: [] });
  if (branchRes.rows.length === 0) throw new Error("No branches found in DB to test");
  const testBranchId = branchRes.rows[0].id as string;

  // --- 1. Admin Role Data Scoping ---
  console.log("--- 1. Data Scoping ---");
  (global as any).testSession = await mockSession("admin");
  
  // Fetch scoped branch financials
  const getFinReq = new Request(`http://localhost:3000/api/admin/branch-financials?branch_id=${testBranchId}`);
  const getFinRes = await branchFinancialsRoute.GET(getFinReq);
  const finData = await getFinRes.json();
  
  if (!finData.financials) throw new Error("Financials array missing");
  if (finData.financials.length !== 1) throw new Error(`Expected exactly 1 branch, got ${finData.financials.length}`);
  if (finData.financials[0].branch_id !== testBranchId) throw new Error("Returned incorrect branch data");
  console.log("PASS: Financials API correctly scoped to specific branch ID.");

  // --- 2. 403 API Protection ---
  console.log("\n--- 2. 403 API Protection ---");
  (global as any).testSession = await mockSession("manager");
  
  // Test Branches GET
  const getBranchReq = new Request(`http://localhost:3000/api/admin/branches/${testBranchId}`);
  const getBranchRes = await branchesIdRoute.GET(getBranchReq, { params: { id: testBranchId } });
  console.log("Manager GET Branch Detail status:", getBranchRes.status);
  if (getBranchRes.status !== 403) throw new Error("Expected 403 on Branch Details GET");

  // Test Financials GET
  const manFinReq = new Request(`http://localhost:3000/api/admin/branch-financials?branch_id=${testBranchId}`);
  const manFinRes = await branchFinancialsRoute.GET(manFinReq);
  console.log("Manager GET Financials status:", manFinRes.status);
  if (manFinRes.status !== 403) throw new Error("Expected 403 on Financials GET");
  
  console.log("PASS: Non-admin roles strictly blocked from individual branch & financials views.");

  console.log("\nVerification complete!");
}

run().catch(console.error);
