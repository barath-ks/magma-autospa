import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

async function main() {
  console.log("Creating username_change_requests table...");

  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS username_change_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        current_login_id TEXT NOT NULL,
        requested_login_id TEXT NOT NULL,
        status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_by TEXT,
        reviewed_at DATETIME,
        reviewer_note TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    console.log("Migration successful: username_change_requests table created.");
  } catch (error: any) {
    console.error("Migration failed:", error);
  }
}

main().catch(console.error);
