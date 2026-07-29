import { db } from "../lib/db";
const mockGetServerSession = require("next-auth/next");
import { v4 as uuidv4 } from "uuid";

// Import Route Handlers
const settingsProfileRoute = require("../app/api/settings/profile-requests/route");
const managerProfileRoute = require("../app/api/manager/profile-requests/route");

async function mockSession(role: string, branch_id: string, user_id: string, name: string = "Test", login_id: string = "ID") {
  return {
    user: { id: user_id, role, branch_id, name, login_id }
  };
}

async function run() {
  console.log("Setting up Profile Change verification...\n");
  mockGetServerSession.getServerSession = async () => (global as any).testSession;

  // 1. Setup Test Data
  const branchId = uuidv4();
  const otherBranchId = uuidv4();
  
  const staffId = uuidv4();
  const staffLoginId = `STAFF-${Date.now().toString().slice(-4)}`;
  const staffName = "Original Staff Name";
  
  const managerId = uuidv4();
  const otherManagerId = uuidv4();
  
  const adminId = uuidv4();
  const adminLoginId = `ADMIN-${Date.now().toString().slice(-4)}`;

  await db.execute({ sql: "INSERT INTO branches (id, name, location) VALUES (?, ?, ?)", args: [branchId, `Test Branch A ${Date.now()}`, "A"] });
  await db.execute({ sql: "INSERT INTO branches (id, name, location) VALUES (?, ?, ?)", args: [otherBranchId, `Test Branch B ${Date.now()}`, "B"] });

  await db.execute({ sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, ?, ?, ?)", args: [staffId, staffLoginId, "hash", "staff", staffName, branchId] });
  await db.execute({ sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, ?, ?, ?)", args: [managerId, `MGR-${Date.now().toString().slice(-4)}`, "hash", "manager", "Branch A Manager", branchId] });
  await db.execute({ sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, ?, ?, ?)", args: [otherManagerId, `MGR2-${Date.now().toString().slice(-4)}`, "hash", "manager", "Branch B Manager", otherBranchId] });
  await db.execute({ sql: "INSERT INTO users (id, login_id, password_hash, role, name, branch_id) VALUES (?, ?, ?, ?, ?, ?)", args: [adminId, adminLoginId, "hash", "admin", "Admin Name", branchId] });

  // ---------------------------------------------------------
  // NAME CHANGE TEST SUITE
  // ---------------------------------------------------------
  console.log("=== NAME CHANGE TESTS ===");
  
  // 1. Staff Submits Name Request
  console.log("\n--- 1. Staff Submits Name Change ---");
  (global as any).testSession = await mockSession("staff", branchId, staffId, staffName, staffLoginId);
  const reqNameBody = JSON.stringify({ field_type: "name", requested_value: "New Staff Name" });
  console.log("Request Body:", reqNameBody);
  const reqName = new Request("http://localhost/api", { method: "POST", body: reqNameBody });
  const resName = await settingsProfileRoute.POST(reqName);
  console.log("Response Status:", resName.status);
  const resNameData = await resName.json();
  const nameRequestId = resNameData.id;

  const dbReq1 = await db.execute({ sql: "SELECT * FROM profile_change_requests WHERE id = ?", args: [nameRequestId] });
  console.log("DB Request Row:", JSON.stringify(dbReq1.rows[0]));

  // 2. Manager (Different Branch) Rejection Attempt
  console.log("\n--- 2. Manager (Different Branch) Approves Name Change ---");
  (global as any).testSession = await mockSession("manager", otherBranchId, otherManagerId);
  const reqMgrFailBody = JSON.stringify({ id: nameRequestId, status: "approved" });
  console.log("Request Body:", reqMgrFailBody);
  const reqMgrFail = new Request("http://localhost/api", { method: "PATCH", body: reqMgrFailBody });
  const resMgrFail = await managerProfileRoute.PATCH(reqMgrFail);
  console.log("Response Status:", resMgrFail.status);
  console.log("Response Body:", JSON.stringify(await resMgrFail.json()));

  const dbReq2 = await db.execute({ sql: "SELECT status FROM profile_change_requests WHERE id = ?", args: [nameRequestId] });
  console.log("DB Request Status:", dbReq2.rows[0].status);

  // 3. Manager (Same Branch) Approval
  console.log("\n--- 3. Manager (Same Branch) Approves Name Change ---");
  const dbUserBefore = await db.execute({ sql: "SELECT name FROM users WHERE id = ?", args: [staffId] });
  console.log("DB User Name (Before Approval):", dbUserBefore.rows[0].name);

  (global as any).testSession = await mockSession("manager", branchId, managerId);
  const reqMgrSuccBody = JSON.stringify({ id: nameRequestId, status: "approved" });
  const reqMgrSucc = new Request("http://localhost/api", { method: "PATCH", body: reqMgrSuccBody });
  const resMgrSucc = await managerProfileRoute.PATCH(reqMgrSucc);
  console.log("Response Status:", resMgrSucc.status);

  const dbUserAfter = await db.execute({ sql: "SELECT name FROM users WHERE id = ?", args: [staffId] });
  console.log("DB User Name (After Approval):", dbUserAfter.rows[0].name);
  const dbReq3 = await db.execute({ sql: "SELECT status FROM profile_change_requests WHERE id = ?", args: [nameRequestId] });
  console.log("DB Request Status:", dbReq3.rows[0].status);


  // ---------------------------------------------------------
  // LOGIN ID CHANGE TEST SUITE
  // ---------------------------------------------------------
  console.log("\n=== LOGIN ID CHANGE TESTS ===");
  const newStaffLoginId = `STAFF-NEW-${Date.now().toString().slice(-4)}`;
  
  // 1. Staff Submits Login ID Request
  console.log("\n--- 1. Staff Submits Login ID Change ---");
  (global as any).testSession = await mockSession("staff", branchId, staffId, dbUserAfter.rows[0].name as string, staffLoginId);
  const reqIdBody = JSON.stringify({ field_type: "login_id", requested_value: newStaffLoginId });
  console.log("Request Body:", reqIdBody);
  const reqId = new Request("http://localhost/api", { method: "POST", body: reqIdBody });
  const resId = await settingsProfileRoute.POST(reqId);
  console.log("Response Status:", resId.status);
  const resIdData = await resId.json();
  const idRequestId = resIdData.id;

  const dbReqId1 = await db.execute({ sql: "SELECT * FROM profile_change_requests WHERE id = ?", args: [idRequestId] });
  console.log("DB Request Row:", JSON.stringify(dbReqId1.rows[0]));

  // 2. Manager (Different Branch) Rejection Attempt
  console.log("\n--- 2. Manager (Different Branch) Approves Login ID Change ---");
  (global as any).testSession = await mockSession("manager", otherBranchId, otherManagerId);
  const reqMgrIdFailBody = JSON.stringify({ id: idRequestId, status: "approved" });
  console.log("Request Body:", reqMgrIdFailBody);
  const reqMgrIdFail = new Request("http://localhost/api", { method: "PATCH", body: reqMgrIdFailBody });
  const resMgrIdFail = await managerProfileRoute.PATCH(reqMgrIdFail);
  console.log("Response Status:", resMgrIdFail.status);
  console.log("Response Body:", JSON.stringify(await resMgrIdFail.json()));

  // 3. Manager (Same Branch) Approval
  console.log("\n--- 3. Manager (Same Branch) Approves Login ID Change ---");
  const dbUserIdBefore = await db.execute({ sql: "SELECT login_id FROM users WHERE id = ?", args: [staffId] });
  console.log("DB User Login ID (Before Approval):", dbUserIdBefore.rows[0].login_id);

  (global as any).testSession = await mockSession("manager", branchId, managerId);
  const reqMgrIdSuccBody = JSON.stringify({ id: idRequestId, status: "approved" });
  const reqMgrIdSucc = new Request("http://localhost/api", { method: "PATCH", body: reqMgrIdSuccBody });
  const resMgrIdSucc = await managerProfileRoute.PATCH(reqMgrIdSucc);
  console.log("Response Status:", resMgrIdSucc.status);

  const dbUserIdAfter = await db.execute({ sql: "SELECT login_id FROM users WHERE id = ?", args: [staffId] });
  console.log("DB User Login ID (After Approval):", dbUserIdAfter.rows[0].login_id);
  const dbReqId3 = await db.execute({ sql: "SELECT status FROM profile_change_requests WHERE id = ?", args: [idRequestId] });
  console.log("DB Request Status:", dbReqId3.rows[0].status);


  // ---------------------------------------------------------
  // ADMIN BYPASS TEST SUITE
  // ---------------------------------------------------------
  console.log("\n=== ADMIN SELF-SERVICE BYPASS TESTS ===");
  
  (global as any).testSession = await mockSession("admin", branchId, adminId, "Admin Name", adminLoginId);
  
  const adminNewName = "Super Admin";
  const adminNewLoginId = `ADMIN-NEW-${Date.now().toString().slice(-4)}`;

  console.log("\n--- Admin Changes Own Name ---");
  const reqAdminName = new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ field_type: "name", requested_value: adminNewName }) });
  const resAdminName = await settingsProfileRoute.POST(reqAdminName);
  console.log("Response Body:", JSON.stringify(await resAdminName.json()));
  
  const dbAdmin1 = await db.execute({ sql: "SELECT name FROM users WHERE id = ?", args: [adminId] });
  console.log("DB User Name:", dbAdmin1.rows[0].name);

  console.log("\n--- Admin Changes Own Login ID ---");
  const reqAdminId = new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ field_type: "login_id", requested_value: adminNewLoginId }) });
  const resAdminId = await settingsProfileRoute.POST(reqAdminId);
  console.log("Response Body:", JSON.stringify(await resAdminId.json()));
  
  const dbAdmin2 = await db.execute({ sql: "SELECT login_id FROM users WHERE id = ?", args: [adminId] });
  console.log("DB User Login ID:", dbAdmin2.rows[0].login_id);

  const dbAdminReqs = await db.execute({ sql: "SELECT * FROM profile_change_requests WHERE user_id = ?", args: [adminId] });
  console.log("DB Requests Created For Admin:", dbAdminReqs.rows.length);

  console.log("\nVerification complete!");
}

run().catch(console.error);
