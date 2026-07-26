import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

async function main() {
  console.log("Migrating OTP tables...");

  try {
    // 1. Add phone to users if it doesn't exist
    const tableInfo = await db.execute("PRAGMA table_info(users)");
    const hasPhone = tableInfo.rows.some(col => col.name === "phone");
    if (!hasPhone) {
      console.log("Adding phone column to users table...");
      await db.execute("ALTER TABLE users ADD COLUMN phone TEXT");
    }

    // 2. Create otp_codes table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        channel TEXT CHECK(channel IN ('phone', 'email')),
        code_hash TEXT NOT NULL,
        purpose TEXT DEFAULT 'password_reset',
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    
    console.log("Migration successful: phone added to users, otp_codes table created.");
  } catch (error: any) {
    console.error("Migration failed:", error);
  }
}

main().catch(console.error);
