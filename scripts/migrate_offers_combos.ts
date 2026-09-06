import { db } from "../lib/db";

async function run() {
  console.log("Starting offers and combos structural migration...");
  
  try {
    // 1. Disable foreign keys
    await db.execute("PRAGMA foreign_keys = OFF;");
    
    // 2. Migrate offers
    await db.execute(`
      CREATE TABLE IF NOT EXISTS offers_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        discount_type TEXT DEFAULT 'reward',
        discount_value REAL,
        points_required INTEGER DEFAULT 0,
        min_spend REAL DEFAULT 0,
        start_date DATETIME,
        end_date DATETIME,
        branch_id TEXT REFERENCES branches(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Copy data from old offers
    await db.execute(`
      INSERT INTO offers_new (id, name, description, points_required, branch_id, is_active, created_at)
      SELECT id, name, description, points_required, branch_id, is_active, created_at
      FROM offers;
    `);
    
    await db.execute("DROP TABLE offers;");
    await db.execute("ALTER TABLE offers_new RENAME TO offers;");
    console.log("Migrated offers table successfully.");
    
    // 3. Migrate combos
    await db.execute(`
      CREATE TABLE IF NOT EXISTS combos_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        bundle_price REAL NOT NULL,
        start_date DATETIME,
        end_date DATETIME,
        branch_id TEXT REFERENCES branches(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Copy data from old combos
    await db.execute(`
      INSERT INTO combos_new (id, name, description, bundle_price, branch_id, is_active, created_at)
      SELECT id, name, description, bundle_price, branch_id, is_active, created_at
      FROM combos;
    `);
    
    await db.execute("DROP TABLE combos;");
    await db.execute("ALTER TABLE combos_new RENAME TO combos;");
    console.log("Migrated combos table successfully.");
    
    // 4. Foreign key check
    const check = await db.execute("PRAGMA foreign_key_check;");
    if (check.rows.length > 0) {
      console.warn("Foreign key check violations found:", check.rows);
    } else {
      console.log("Foreign key check passed.");
    }
    
    // 5. Re-enable foreign keys
    await db.execute("PRAGMA foreign_keys = ON;");
    console.log("Migration completed successfully.");

  } catch (error) {
    console.error("Migration failed:", error);
    // ensure FKs are turned back on
    await db.execute("PRAGMA foreign_keys = ON;");
  }
}

run();
