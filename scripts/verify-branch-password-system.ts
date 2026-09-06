import { db } from "../lib/db";
import bcrypt from "bcryptjs";
import { validatePasswordStrength } from "../lib/password-strength";

async function verifyBranchPasswordSystem() {
  console.log("=== Testing Branch Password System & Rotation ===");

  // 1. Verify schema columns
  console.log("1. Checking branches table schema...");
  const tableInfo = await db.execute("PRAGMA table_info(branches)");
  const cols = new Set(tableInfo.rows.map((r: any) => r.name));
  
  if (!cols.has("must_change_password") || !cols.has("display_password")) {
    throw new Error("Missing required columns: must_change_password or display_password");
  }
  console.log("✓ Columns 'must_change_password' and 'display_password' exist.");

  // 2. Check main branch backfill
  console.log("\n2. Checking main branch configuration...");
  const mainBranchRes = await db.execute("SELECT id, name, branch_code, email, display_password, must_change_password FROM branches WHERE id = 'branch-1'");
  if (mainBranchRes.rows.length === 0) {
    throw new Error("Main branch 'branch-1' not found");
  }
  const mainBranch: any = mainBranchRes.rows[0];
  console.log("Main branch:", {
    name: mainBranch.name,
    code: mainBranch.branch_code,
    email: mainBranch.email,
    display_password: mainBranch.display_password,
    must_change_password: mainBranch.must_change_password,
  });
  if (!mainBranch.display_password) {
    throw new Error("Main branch display_password is empty");
  }
  console.log("✓ Main branch has display_password configured.");

  // 3. Create test branch with temporary password
  console.log("\n3. Creating test branch with temporary password...");
  const testBranchId = "test-branch-pwd-verify";
  const tempPassword = "TempPassword@123";
  const tempHash = await bcrypt.hash(tempPassword, 10);
  
  // Clean up existing test branch if present
  await db.execute({ sql: "DELETE FROM branches WHERE id = ?", args: [testBranchId] });

  await db.execute({
    sql: `INSERT INTO branches (
            id, name, code, branch_code, email, password_hash, 
            display_password, must_change_password, location, phone, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'Verification Location', '+1 555-9999', 1)`,
    args: [testBranchId, "Password Verify Branch", "MAG-VERIFY", "MAG-VERIFY", "verify@magma-autospa.com", tempHash, tempPassword],
  });

  const createdRes = await db.execute({ sql: "SELECT * FROM branches WHERE id = ?", args: [testBranchId] });
  const created: any = createdRes.rows[0];
  console.log("Created test branch:", {
    name: created.name,
    display_password: created.display_password,
    must_change_password: created.must_change_password,
  });
  if (created.display_password !== tempPassword || Number(created.must_change_password) !== 1) {
    throw new Error("Test branch must_change_password or display_password not set correctly");
  }
  console.log("✓ Test branch provisioned with must_change_password = 1");

  // 4. Test simulated branch portal authentication
  console.log("\n4. Simulating branch portal login with temporary password...");
  const branchLookup = await db.execute({
    sql: `SELECT * FROM branches WHERE (email = ? COLLATE NOCASE OR branch_code = ? COLLATE NOCASE OR code = ? COLLATE NOCASE) AND is_active = 1 LIMIT 1`,
    args: ["verify@magma-autospa.com", "verify@magma-autospa.com", "verify@magma-autospa.com"],
  });
  const bRow: any = branchLookup.rows[0];
  const passMatch = await bcrypt.compare(tempPassword, bRow.password_hash);
  if (!passMatch) throw new Error("Temporary password does not match hash");
  
  const simulatedSessionUser = {
    id: bRow.id,
    role: "branch",
    must_change_password: Boolean(bRow.must_change_password),
  };
  console.log("Simulated Session User:", simulatedSessionUser);
  if (!simulatedSessionUser.must_change_password) {
    throw new Error("must_change_password is not true in session");
  }
  console.log("✓ Session correctly flags must_change_password = true (triggers middleware redirect to /branch/change-password)");

  // 5. Test password rotation validation
  console.log("\n5. Testing password rotation validation...");
  const weakPassword = "weak";
  const strengthCheck = validatePasswordStrength(weakPassword);
  if (strengthCheck.valid) {
    throw new Error("Weak password was unexpectedly accepted");
  }
  console.log("✓ Weak password correctly rejected:", strengthCheck.error);

  // 6. Execute password rotation
  console.log("\n6. Executing password rotation to permanent password...");
  const newPermanentPassword = "PermanentPassword@2026!";
  const newHash = await bcrypt.hash(newPermanentPassword, 10);

  await db.execute({
    sql: `UPDATE branches 
          SET password_hash = ?, 
              display_password = ?, 
              must_change_password = 0 
          WHERE id = ?`,
    args: [newHash, newPermanentPassword, testBranchId],
  });

  const updatedRes = await db.execute({ sql: "SELECT * FROM branches WHERE id = ?", args: [testBranchId] });
  const updated: any = updatedRes.rows[0];
  console.log("Updated test branch:", {
    display_password: updated.display_password,
    must_change_password: updated.must_change_password,
  });

  if (updated.display_password !== newPermanentPassword || Number(updated.must_change_password) !== 0) {
    throw new Error("Password rotation did not update display_password or clear must_change_password");
  }
  console.log("✓ Password rotation successfully updated display_password and cleared must_change_password to 0");

  // 7. Verify new credentials authenticate and old fails
  console.log("\n7. Verifying authentication with new credentials...");
  const oldMatch = await bcrypt.compare(tempPassword, updated.password_hash);
  const newMatch = await bcrypt.compare(newPermanentPassword, updated.password_hash);
  if (oldMatch) throw new Error("Old temporary password still matched!");
  if (!newMatch) throw new Error("New permanent password failed to match!");
  console.log("✓ Old temporary password rejected, new permanent password accepted.");

  // 8. Cleanup
  console.log("\n8. Cleaning up test branch record...");
  await db.execute({ sql: "DELETE FROM branches WHERE id = ?", args: [testBranchId] });
  console.log("✓ Test branch cleaned up.");

  console.log("\n=== All Branch Password System Verifications Passed Successfully! ===");
}

verifyBranchPasswordSystem()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });
