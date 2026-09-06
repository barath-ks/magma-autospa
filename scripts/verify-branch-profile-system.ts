import { db } from "../lib/db";
import { authOptions } from "../lib/auth";
import bcrypt from "bcryptjs";

async function verifyBranchProfileSystem() {
  console.log("==================================================");
  console.log("VERIFYING BRANCH PROFILE & ARCHITECTURE MIGRATION");
  console.log("==================================================");

  let allPassed = true;

  // 1. Verify branches table schema and credentials
  console.log("\n[1] Verifying branches table structure & credentials...");
  const branchesTableInfo = await db.execute("PRAGMA table_info(branches)");
  const cols = new Set(branchesTableInfo.rows.map((r: any) => r.name));
  
  const requiredCols = ["email", "password_hash", "branch_code", "address"];
  for (const col of requiredCols) {
    if (cols.has(col)) {
      console.log(`  ✅ Column '${col}' exists in branches`);
    } else {
      console.error(`  ❌ Missing column '${col}' in branches`);
      allPassed = false;
    }
  }

  const branch1Res = await db.execute({
    sql: "SELECT id, name, branch_code, email, password_hash, address FROM branches WHERE id = 'branch-1'",
    args: []
  });
  if (branch1Res.rows.length > 0) {
    const b = branch1Res.rows[0];
    console.log(`  ✅ Main Branch Profile: ${b.name} | Code: ${b.branch_code} | Email: ${b.email}`);
    if (!b.password_hash) {
      console.error("  ❌ Missing password_hash for branch-1");
      allPassed = false;
    }
  } else {
    console.error("  ❌ branch-1 not found in branches table");
    allPassed = false;
  }

  // 2. Verify NextAuth authorize provider
  console.log("\n[2] Verifying NextAuth authorize credentials...");
  const provider = authOptions.providers[0] as any;
  const authorize = provider.options.authorize;

  // 2a. Branch login via email
  const branchAuthByEmail = await authorize({
    login_id: "main@magma-autospa.com",
    password: "Magma@123",
    remember: "true"
  });
  if (branchAuthByEmail && branchAuthByEmail.role === "branch" && branchAuthByEmail.branch_id === "branch-1") {
    console.log("  ✅ Branch login via EMAIL successful:", {
      name: branchAuthByEmail.name,
      role: branchAuthByEmail.role,
      branch_id: branchAuthByEmail.branch_id,
      branch_code: branchAuthByEmail.branch_code
    });
  } else {
    console.error("  ❌ Branch login via EMAIL failed:", branchAuthByEmail);
    allPassed = false;
  }

  // 2b. Branch login via branch_code
  const branchAuthByCode = await authorize({
    login_id: "MAG-BRANCH-01",
    password: "Magma@123",
    remember: "true"
  });
  if (branchAuthByCode && branchAuthByCode.role === "branch" && branchAuthByCode.branch_id === "branch-1") {
    console.log("  ✅ Branch login via BRANCH_CODE successful:", {
      name: branchAuthByCode.name,
      role: branchAuthByCode.role,
      branch_id: branchAuthByCode.branch_id
    });
  } else {
    console.error("  ❌ Branch login via BRANCH_CODE failed:", branchAuthByCode);
    allPassed = false;
  }

  // 2c. Verify individual staff login is retired / rejected
  const staffAuth = await authorize({
    login_id: "MAG-0001",
    password: "password123",
    remember: "false"
  });
  if (staffAuth === null) {
    console.log("  ✅ Individual staff member login (MAG-0001) successfully retired / rejected (returns null)");
  } else {
    console.error("  ❌ Individual staff member login should return null, but returned:", staffAuth);
    allPassed = false;
  }

  // 2d. Verify manager login continues to work
  const managerAuth = await authorize({
    login_id: "test_manager",
    password: "Manager@Magma2026!",
    remember: "true"
  });
  if (managerAuth && managerAuth.role === "manager") {
    console.log("  ✅ Corporate manager login continues to work:", {
      name: managerAuth.name,
      role: managerAuth.role,
      branch_id: managerAuth.branch_id
    });
  } else {
    console.error("  ❌ Manager login failed:", managerAuth);
    allPassed = false;
  }

  // 3. Verify redemptions table schema for branch-anchored operations
  console.log("\n[3] Verifying redemptions table schema...");
  const redemptionsInfo = await db.execute("PRAGMA table_info(redemptions)");
  const staffIdInfo: any = redemptionsInfo.rows.find((r: any) => r.name === "staff_id");
  if (staffIdInfo && staffIdInfo.notnull === 0) {
    console.log("  ✅ redemptions.staff_id is nullable (safe for branch-level processing)");
  } else {
    console.error("  ❌ redemptions.staff_id is NOT nullable:", staffIdInfo);
    allPassed = false;
  }

  console.log("\n==================================================");
  if (allPassed) {
    console.log("🎉 ALL BRANCH PROFILE VERIFICATIONS PASSED!");
  } else {
    console.error("⚠️ SOME VERIFICATIONS FAILED");
    process.exit(1);
  }
  console.log("==================================================");
}

verifyBranchProfileSystem()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification error:", err);
    process.exit(1);
  });
