import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

async function main() {
  console.log("Creating shift_requests table...");

  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS shift_requests (
        id TEXT PRIMARY KEY,
        staff_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        requested_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
        staff_note TEXT,
        manager_note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_at DATETIME,
        FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
      );
    `);
    console.log("Migration successful: shift_requests table created.");
  } catch (error: any) {
    console.error("Migration failed:", error);
  }
}

main().catch(console.error);
