import { db } from "../lib/db";

async function run() {
  try {
    console.log("Starting profile change requests migration...");

    // 1. Create the new table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS profile_change_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        field_type TEXT CHECK(field_type IN ('login_id', 'name')) NOT NULL,
        current_value TEXT NOT NULL,
        requested_value TEXT NOT NULL,
        status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_by TEXT,
        reviewed_at DATETIME,
        reviewer_note TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log("Created profile_change_requests table.");

    // 2. Check if old table exists
    const oldTableCheck = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='username_change_requests'");
    
    if (oldTableCheck.rows.length > 0) {
      // 3. Migrate data
      await db.execute(`
        INSERT INTO profile_change_requests (
          id, user_id, field_type, current_value, requested_value, status, requested_at, reviewed_by, reviewed_at, reviewer_note
        )
        SELECT 
          id, user_id, 'login_id' as field_type, current_login_id as current_value, requested_login_id as requested_value, status, requested_at, reviewed_by, reviewed_at, reviewer_note
        FROM username_change_requests
      `);
      console.log("Migrated data to profile_change_requests.");

      // 4. Drop the old table
      await db.execute("DROP TABLE username_change_requests");
      console.log("Dropped username_change_requests table.");
    } else {
      console.log("username_change_requests table does not exist. Skipping data migration.");
    }

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

run();
