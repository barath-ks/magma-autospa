import { db } from "../lib/db";

export async function migrateBranchPasswords() {
  console.log("Starting branch passwords migration...");

  // 1. Inspect existing columns in branches
  const branchTableInfo = await db.execute("PRAGMA table_info(branches)");
  const branchColumns = new Set(branchTableInfo.rows.map((row: any) => row.name));

  if (!branchColumns.has("must_change_password")) {
    console.log("Adding 'must_change_password' column to branches...");
    await db.execute("ALTER TABLE branches ADD COLUMN must_change_password BOOLEAN DEFAULT 1");
  } else {
    console.log("'must_change_password' column already exists in branches.");
  }

  if (!branchColumns.has("display_password")) {
    console.log("Adding 'display_password' column to branches...");
    await db.execute("ALTER TABLE branches ADD COLUMN display_password TEXT");
  } else {
    console.log("'display_password' column already exists in branches.");
  }

  // 2. Backfill existing branches
  console.log("Backfilling existing branch credentials...");
  await db.execute({
    sql: `UPDATE branches 
          SET display_password = COALESCE(display_password, 'Magma@123'),
              must_change_password = 0
          WHERE id = 'branch-1'`,
  });
  console.log("Main branch (branch-1) set to display_password='Magma@123', must_change_password=0");

  console.log("Branch passwords migration completed successfully.");
}

if (require.main === module) {
  migrateBranchPasswords()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
