import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

async function main() {
  console.log("=== Branch Cleanup & Verification ===");

  // 1. Initial State
  const initialBranchesRes = await db.execute("SELECT id, name FROM branches");
  const branchesToDelete = initialBranchesRes.rows.filter(b => b.id !== 'branch-1' && b.id !== 'branch-2');
  const branchIds = branchesToDelete.map(b => `'${b.id}'`).join(',');
  
  console.log(`Initial branches count: ${initialBranchesRes.rows.length}`);
  console.log(`Branches targeted for deletion: ${branchesToDelete.length}`);
  if (branchesToDelete.length === 0) {
    console.log("No branches to delete.");
    return;
  }

  // Record initial counts for kept branches to verify they are untouched
  const keptBranchCounts = {};
  for (const table of ['transactions', 'users', 'customers', 'offers', 'redemptions']) {
    const res = await db.execute(`SELECT COUNT(*) as c FROM ${table} WHERE branch_id IN ('branch-1', 'branch-2')`);
    keptBranchCounts[table] = res.rows[0].c;
  }
  console.log("Initial records in branch-1 & branch-2:", keptBranchCounts);

  // 2. Cascade Deletes
  console.log("\\nExecuting cascaded hard-deletes...");
  
  // child tables of transactions
  await db.execute(`DELETE FROM transaction_services WHERE transaction_id IN (SELECT id FROM transactions WHERE branch_id IN (${branchIds}))`);
  // child tables of customers
  await db.execute(`DELETE FROM customer_otp_codes WHERE customer_id IN (SELECT id FROM customers WHERE branch_id IN (${branchIds}))`);
  await db.execute(`DELETE FROM loyalty_points_ledger WHERE customer_id IN (SELECT id FROM customers WHERE branch_id IN (${branchIds}))`);
  // child tables of users
  await db.execute(`DELETE FROM otp_codes WHERE user_id IN (SELECT id FROM users WHERE branch_id IN (${branchIds}))`);
  
  // direct branch children
  await db.execute(`DELETE FROM redemptions WHERE branch_id IN (${branchIds})`);
  await db.execute(`DELETE FROM transactions WHERE branch_id IN (${branchIds})`);
  await db.execute(`DELETE FROM customers WHERE branch_id IN (${branchIds})`);
  await db.execute(`DELETE FROM offers WHERE branch_id IN (${branchIds})`);
  await db.execute(`DELETE FROM users WHERE branch_id IN (${branchIds})`);
  
  // finally delete branches
  await db.execute(`DELETE FROM branches WHERE id IN (${branchIds})`);

  console.log("✅ Cascaded deletions completed.");

  // 3. Final State & Verification
  console.log("\\n=== Verification Results ===");
  const finalBranchesRes = await db.execute("SELECT id, name FROM branches");
  console.log(`Final active branches count: ${finalBranchesRes.rows.length}`);
  finalBranchesRes.rows.forEach(b => console.log(`- ${b.id}: ${b.name}`));

  if (finalBranchesRes.rows.length === 2) {
    console.log("✅ Final Branches list shows ONLY branch-1 and branch-2.");
  } else {
    console.error("❌ Final branches count is not 2.");
  }

  const finalKeptBranchCounts = {};
  let dataUntouched = true;
  for (const table of ['transactions', 'users', 'customers', 'offers', 'redemptions']) {
    const res = await db.execute(`SELECT COUNT(*) as c FROM ${table} WHERE branch_id IN ('branch-1', 'branch-2')`);
    finalKeptBranchCounts[table] = res.rows[0].c;
    if (finalKeptBranchCounts[table] !== keptBranchCounts[table]) {
      dataUntouched = false;
    }
  }
  
  if (dataUntouched) {
    console.log("✅ branch-1 and branch-2 existing data (transactions, users, etc.) is completely untouched.");
  } else {
    console.error("❌ branch-1 and branch-2 data was altered! Before:", keptBranchCounts, "After:", finalKeptBranchCounts);
  }

  // Orphan checks
  let noOrphans = true;
  const orphanChecks = [
    { name: 'transactions', query: "SELECT COUNT(*) as c FROM transactions WHERE branch_id NOT IN (SELECT id FROM branches)" },
    { name: 'users', query: "SELECT COUNT(*) as c FROM users WHERE branch_id NOT IN (SELECT id FROM branches)" },
    { name: 'customers', query: "SELECT COUNT(*) as c FROM customers WHERE branch_id NOT IN (SELECT id FROM branches)" },
    { name: 'offers', query: "SELECT COUNT(*) as c FROM offers WHERE branch_id NOT IN (SELECT id FROM branches)" },
    { name: 'redemptions', query: "SELECT COUNT(*) as c FROM redemptions WHERE branch_id NOT IN (SELECT id FROM branches)" }
  ];

  for (const check of orphanChecks) {
    const res = await db.execute(check.query);
    const count = res.rows[0].c;
    if (Number(count) > 0) {
      console.error(`❌ Found ${count} orphaned rows in ${check.name}!`);
      noOrphans = false;
    }
  }

  if (noOrphans) {
    console.log("✅ Zero orphaned rows remain in any table referencing branch_id.");
  }
}

main().catch(console.error);
