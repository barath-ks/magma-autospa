import { db } from "../lib/db";

async function migrate() {
  console.log("Migrating database for branch expenses...");
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS branch_expenses (
        id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        entered_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    console.log("Successfully created branch_expenses table.");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

migrate();
