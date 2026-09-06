import { db } from "../lib/db";
import bcrypt from "bcryptjs";

export async function migrateBranchProfiles() {
  console.log("Starting branch profiles migration...");

  // 1. Inspect existing columns in branches
  const branchTableInfo = await db.execute("PRAGMA table_info(branches)");
  const branchColumns = new Set(branchTableInfo.rows.map((row: any) => row.name));

  if (!branchColumns.has("email")) {
    console.log("Adding 'email' column to branches...");
    await db.execute("ALTER TABLE branches ADD COLUMN email TEXT");
  }

  if (!branchColumns.has("password_hash")) {
    console.log("Adding 'password_hash' column to branches...");
    await db.execute("ALTER TABLE branches ADD COLUMN password_hash TEXT");
  }

  if (!branchColumns.has("branch_code")) {
    console.log("Adding 'branch_code' column to branches...");
    await db.execute("ALTER TABLE branches ADD COLUMN branch_code TEXT");
  }

  if (!branchColumns.has("address")) {
    console.log("Adding 'address' column to branches...");
    await db.execute("ALTER TABLE branches ADD COLUMN address TEXT");
  }

  // 2. Handle redemptions staff_id nullability
  const redemptionTableInfo = await db.execute("PRAGMA table_info(redemptions)");
  const staffIdCol: any = redemptionTableInfo.rows.find((row: any) => row.name === "staff_id");
  
  if (staffIdCol && staffIdCol.notnull === 1) {
    console.log("Updating redemptions table schema to make staff_id nullable...");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS redemptions_new (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        staff_id TEXT,
        offer_id TEXT NOT NULL,
        points_redeemed INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
        FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE RESTRICT
      )
    `);

    await db.execute(`
      INSERT INTO redemptions_new (id, customer_id, branch_id, staff_id, offer_id, points_redeemed, created_at)
      SELECT id, customer_id, branch_id, staff_id, offer_id, points_redeemed, created_at FROM redemptions
    `);

    await db.execute("DROP TABLE redemptions");
    await db.execute("ALTER TABLE redemptions_new RENAME TO redemptions");
    console.log("Redemptions table successfully updated with nullable staff_id.");
  }

  // 3. Seed / Update branch credentials
  const defaultPasswordHash = await bcrypt.hash("Magma@123", 10);
  const branchesRes = await db.execute("SELECT id, name, code, location, email, branch_code FROM branches");

  for (const branch of branchesRes.rows as any[]) {
    let email = branch.email;
    let branchCode = branch.branch_code || branch.code;
    let address = branch.location || "Default Location";

    if (branch.id === "branch-1") {
      email = "main@magma-autospa.com";
      branchCode = "MAG-BRANCH-01";
      address = "123 Magma Boulevard, Downtown";
    } else if (branch.id === "branch-2") {
      email = "branch2@magma-autospa.com";
      branchCode = "MAG-BRANCH-02";
      address = "456 Auto Avenue, Uptown";
    } else {
      if (!email) {
        email = `${branchCode || branch.id}@magma-autospa.internal`;
      }
      if (!branchCode) {
        branchCode = `MAG-${branch.id.slice(0, 8).toUpperCase()}`;
      }
    }

    await db.execute({
      sql: `UPDATE branches 
            SET email = ?, password_hash = ?, branch_code = ?, address = ?, code = COALESCE(code, ?) 
            WHERE id = ?`,
      args: [email, defaultPasswordHash, branchCode, address, branchCode, branch.id],
    });

    console.log(`Updated branch credentials: ${branch.name} (${branchCode}) -> ${email}`);
  }

  // 4. Create unique indexes on email and branch_code
  try {
    await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_email ON branches(email)");
    await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_branch_code ON branches(branch_code)");
  } catch (e) {
    console.log("Unique index creation notice:", e);
  }

  console.log("Branch profiles migration completed successfully.");
}

if (require.main === module) {
  migrateBranchProfiles()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
