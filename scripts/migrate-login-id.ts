import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

async function main() {
  console.log("Starting login_id schema migration...");

  try {
    // 1. Create a new table with the updated schema (login_id unique not null, email nullable)
    console.log("Creating users_new table...");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users_new (
        id TEXT PRIMARY KEY,
        login_id TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT CHECK(role IN ('staff', 'manager', 'admin')) NOT NULL,
        branch_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
      );
    `);

    // 2. Copy data from the old table to the new table, assigning a fallback login_id for existing users
    console.log("Copying data from users to users_new...");
    
    // Check if old users table exists and has data
    const existingUsers = await db.execute("SELECT * FROM users");
    
    for (const user of existingUsers.rows) {
      const emailStr = user.email as string;
      const role = user.role as string;
      
      // Generate a fallback login_id based on role if we're migrating existing dev users
      let fallbackId = emailStr.split('@')[0].toUpperCase();
      if (fallbackId === "ADMIN") fallbackId = "ADM-0001";
      if (fallbackId === "MANAGER") fallbackId = "MGR-0001";
      if (fallbackId === "STAFF") fallbackId = "MAG-0001";

      await db.execute({
        sql: `INSERT OR IGNORE INTO users_new (id, login_id, email, password_hash, role, branch_id, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          user.id,
          fallbackId, // new login_id
          user.email,
          user.password_hash,
          user.role,
          user.branch_id,
          user.created_at
        ]
      });
    }

    // 3. Drop the old table
    console.log("Dropping old users table...");
    // Since password_resets depends on users, we must drop it first or PRAGMA foreign_keys = OFF. 
    // Wait, SQLite doesn't strictly enforce dropping tables with FKs if pragma foreign_keys=OFF.
    // We'll drop password_resets and recreate it to be safe.
    await db.execute("DROP TABLE IF EXISTS password_resets");
    await db.execute("DROP TABLE IF EXISTS users");

    // 4. Rename the new table
    console.log("Renaming users_new to users...");
    await db.execute("ALTER TABLE users_new RENAME TO users");

    // 5. Recreate password_resets
    console.log("Recreating password_resets table...");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    console.log("Migration successful: users table now uses login_id!");

  } catch (error) {
    console.error("Migration failed:", error);
  }
}

main().catch(console.error);
