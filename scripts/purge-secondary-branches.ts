import { db } from "../lib/db";
import bcrypt from "bcryptjs";

export async function purgeSecondaryBranches() {
  console.log("================================================================");
  console.log("PURGING SECONDARY BRANCHES & LEGACY STAFF PROFILES");
  console.log("================================================================");

  const PRIMARY_BRANCH_ID = "branch-1";

  // Disable FK constraints during cleanup batch
  await db.execute("PRAGMA foreign_keys = OFF;");

  try {
    // 1. Verify Primary Branch exists and configure credentials
    const mainBranchRes = await db.execute({
      sql: "SELECT * FROM branches WHERE id = ?",
      args: [PRIMARY_BRANCH_ID],
    });

    const defaultHash = await bcrypt.hash("Magma@123", 10);

    if (mainBranchRes.rows.length === 0) {
      console.log("Primary branch-1 not found, creating it...");
      await db.execute({
        sql: `INSERT INTO branches (id, name, code, branch_code, email, password_hash, location, address, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          PRIMARY_BRANCH_ID,
          "Main Branch",
          "MAG-BRANCH-01",
          "MAG-BRANCH-01",
          "main@magma-autospa.com",
          defaultHash,
          "Downtown",
          "123 Magma Boulevard, Downtown",
        ],
      });
    } else {
      await db.execute({
        sql: `UPDATE branches 
              SET name = 'Main Branch',
                  branch_code = 'MAG-BRANCH-01',
                  code = 'MAG-BRANCH-01',
                  email = 'main@magma-autospa.com',
                  password_hash = ?,
                  location = 'Downtown',
                  address = '123 Magma Boulevard, Downtown',
                  is_active = 1
              WHERE id = ?`,
        args: [defaultHash, PRIMARY_BRANCH_ID],
      });
    }
    console.log("✅ Primary branch-1 confirmed as 'Main Branch' (MAG-BRANCH-01 / main@magma-autospa.com).");

    // 2. Identify secondary branches
    const secBranchesRes = await db.execute({
      sql: "SELECT id, name FROM branches WHERE id != ?",
      args: [PRIMARY_BRANCH_ID],
    });
    const secondaryBranchIds = secBranchesRes.rows.map((r: any) => r.id);
    console.log(`Found ${secondaryBranchIds.length} secondary branches to purge.`);

    if (secondaryBranchIds.length > 0) {
      const bHolders = secondaryBranchIds.map(() => "?").join(",");

      // Clean transactions for secondary branches
      await db.execute({
        sql: `DELETE FROM transaction_services WHERE transaction_id IN (SELECT id FROM transactions WHERE branch_id IN (${bHolders}))`,
        args: secondaryBranchIds,
      });
      await db.execute({
        sql: `DELETE FROM loyalty_points_ledger WHERE related_transaction_id IN (SELECT id FROM transactions WHERE branch_id IN (${bHolders}))`,
        args: secondaryBranchIds,
      });
      await db.execute({
        sql: `DELETE FROM transactions WHERE branch_id IN (${bHolders})`,
        args: secondaryBranchIds,
      });

      // Clean customers for secondary branches
      await db.execute({
        sql: `DELETE FROM vehicles WHERE customer_id IN (SELECT id FROM customers WHERE branch_id IN (${bHolders}))`,
        args: secondaryBranchIds,
      });
      await db.execute({
        sql: `DELETE FROM customer_otp_codes WHERE customer_id IN (SELECT id FROM customers WHERE branch_id IN (${bHolders}))`,
        args: secondaryBranchIds,
      });
      await db.execute({
        sql: `DELETE FROM loyalty_points_ledger WHERE customer_id IN (SELECT id FROM customers WHERE branch_id IN (${bHolders}))`,
        args: secondaryBranchIds,
      });
      await db.execute({
        sql: `DELETE FROM redemptions WHERE customer_id IN (SELECT id FROM customers WHERE branch_id IN (${bHolders})) OR branch_id IN (${bHolders})`,
        args: [...secondaryBranchIds, ...secondaryBranchIds],
      });
      await db.execute({
        sql: `DELETE FROM customers WHERE branch_id IN (${bHolders})`,
        args: secondaryBranchIds,
      });

      // Clean combos, services, offers
      await db.execute({
        sql: `DELETE FROM service_offers WHERE branch_id IN (${bHolders})`,
        args: secondaryBranchIds,
      });
      await db.execute({
        sql: `DELETE FROM combo_services WHERE combo_id IN (SELECT id FROM combos WHERE branch_id IN (${bHolders}))`,
        args: secondaryBranchIds,
      });
      await db.execute({
        sql: `DELETE FROM combos WHERE branch_id IN (${bHolders})`,
        args: secondaryBranchIds,
      });
      await db.execute({
        sql: `DELETE FROM offers WHERE branch_id IN (${bHolders})`,
        args: secondaryBranchIds,
      });
      await db.execute({
        sql: `DELETE FROM services WHERE branch_id IS NOT NULL AND branch_id IN (${bHolders})`,
        args: secondaryBranchIds,
      });
      await db.execute({
        sql: `DELETE FROM branch_expenses WHERE branch_id IN (${bHolders})`,
        args: secondaryBranchIds,
      });

      // Delete secondary branches
      await db.execute({
        sql: `DELETE FROM branches WHERE id IN (${bHolders})`,
        args: secondaryBranchIds,
      });
      console.log(`✅ Successfully deleted ${secondaryBranchIds.length} secondary branches.`);
    }

    // 3. Purge Staff Users and Obsolete Secondary Managers
    console.log("Purging eliminated staff accounts and non-primary managers...");
    
    // Core users to keep: TEST_ADMIN, test_manager
    const staffAndObsoleteUsersRes = await db.execute({
      sql: `SELECT id, login_id, role FROM users WHERE role = 'staff' OR (login_id NOT IN ('TEST_ADMIN', 'test_admin', 'test_manager'))`,
      args: [],
    });
    const usersToPurgeIds = staffAndObsoleteUsersRes.rows.map((r: any) => r.id);

    if (usersToPurgeIds.length > 0) {
      const uHolders = usersToPurgeIds.map(() => "?").join(",");

      await db.execute({
        sql: `DELETE FROM password_history WHERE user_id IN (${uHolders})`,
        args: usersToPurgeIds,
      });
      await db.execute({
        sql: `DELETE FROM password_resets WHERE user_id IN (${uHolders})`,
        args: usersToPurgeIds,
      });
      await db.execute({
        sql: `DELETE FROM profile_change_requests WHERE user_id IN (${uHolders})`,
        args: usersToPurgeIds,
      });
      await db.execute({
        sql: `DELETE FROM otp_codes WHERE user_id IN (${uHolders})`,
        args: usersToPurgeIds,
      });

      // Set staff_id = NULL in transactions / redemptions
      await db.execute({
        sql: `UPDATE transactions SET staff_id = NULL WHERE staff_id IN (${uHolders})`,
        args: usersToPurgeIds,
      });
      await db.execute({
        sql: `UPDATE redemptions SET staff_id = NULL WHERE staff_id IN (${uHolders})`,
        args: usersToPurgeIds,
      });

      // Delete the users
      await db.execute({
        sql: `DELETE FROM users WHERE id IN (${uHolders})`,
        args: usersToPurgeIds,
      });
      console.log(`✅ Successfully purged ${usersToPurgeIds.length} staff & obsolete user records.`);
    }

    // 4. Verify & Align Core Corporate Accounts
    await db.execute({
      sql: `UPDATE users SET branch_id = ?, password_hash = ? WHERE login_id = 'test_manager'`,
      args: [PRIMARY_BRANCH_ID, defaultHash],
    });
    await db.execute({
      sql: `UPDATE users SET login_id = 'TEST_ADMIN', password_hash = ?, branch_id = NULL, is_active = 1 WHERE role = 'admin'`,
      args: [defaultHash],
    });

    // 5. Ensure any remaining services and customers point to branch-1
    await db.execute({
      sql: `UPDATE services SET branch_id = ? WHERE branch_id IS NOT NULL`,
      args: [PRIMARY_BRANCH_ID],
    });
    await db.execute({
      sql: `UPDATE customers SET branch_id = ?`,
      args: [PRIMARY_BRANCH_ID],
    });
    await db.execute({
      sql: `UPDATE transactions SET branch_id = ?`,
      args: [PRIMARY_BRANCH_ID],
    });

    // 5b. Clean up any orphaned child records to ensure foreign key integrity
    await db.execute({
      sql: `DELETE FROM transaction_services WHERE service_id NOT IN (SELECT id FROM services) OR transaction_id NOT IN (SELECT id FROM transactions)`,
      args: [],
    });
    await db.execute({
      sql: `DELETE FROM branch_expenses WHERE branch_id != ?`,
      args: [PRIMARY_BRANCH_ID],
    });
    await db.execute({
      sql: `UPDATE branch_expenses SET entered_by = (SELECT id FROM users WHERE login_id = 'test_manager' LIMIT 1) WHERE entered_by NOT IN (SELECT id FROM users)`,
      args: [],
    });

    console.log("✅ Core corporate users (test_manager, test_admin) aligned to primary branch & corporate.");
    console.log("✅ Orphaned transaction_services and branch_expenses sanitized.");

  } finally {
    // Re-enable FK checks
    await db.execute("PRAGMA foreign_keys = ON;");
  }

  // 6. Run FK Check to ensure complete database integrity
  const fkCheckRes = await db.execute("PRAGMA foreign_key_check;");
  if (fkCheckRes.rows.length > 0) {
    console.error("⚠️ Foreign key check errors found:", fkCheckRes.rows);
  } else {
    console.log("✅ PRAGMA foreign_key_check: 0 violations! Database integrity intact.");
  }

  // 7. Summary
  console.log("\n==============================================================");
  console.log("FINAL STATE POST-CLEANUP:");
  console.log("==============================================================");

  const remainingBranches = await db.execute("SELECT id, name, branch_code, email, address, is_active FROM branches");
  console.log("Active Branches (Total: " + remainingBranches.rows.length + "):", remainingBranches.rows);

  const remainingUsers = await db.execute("SELECT id, login_id, role, name, branch_id FROM users");
  console.log("Active Corporate Accounts (Total: " + remainingUsers.rows.length + "):", remainingUsers.rows);

  const custCount = await db.execute("SELECT COUNT(*) as c FROM customers");
  const txnCount = await db.execute("SELECT COUNT(*) as c FROM transactions");
  const srvCount = await db.execute("SELECT COUNT(*) as c FROM services");
  const ofrCount = await db.execute("SELECT COUNT(*) as c FROM offers");

  console.log("Active Customers:", custCount.rows[0].c);
  console.log("Active Transactions:", txnCount.rows[0].c);
  console.log("Active Services:", srvCount.rows[0].c);
  console.log("Active Offers:", ofrCount.rows[0].c);
  console.log("==============================================================\n");

  if (remainingBranches.rows.length === 1 && remainingBranches.rows[0].id === PRIMARY_BRANCH_ID) {
    console.log("🎉 SUCCESS: Only Main Branch (branch-1) exists!");
  } else {
    console.error("❌ ERROR: Unexpected branch count!");
    process.exit(1);
  }
}

if (require.main === module) {
  purgeSecondaryBranches()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Purge failed:", err);
      process.exit(1);
    });
}
