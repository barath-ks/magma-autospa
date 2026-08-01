import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

async function main() {
  console.log("Migrating customer OTP tables...");

  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS customer_otp_codes (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        channel TEXT CHECK(channel IN ('phone', 'email')),
        code_hash TEXT NOT NULL,
        purpose TEXT DEFAULT 'redemption',
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );
    `);
    
    console.log("Migration successful: customer_otp_codes table created.");
  } catch (error: any) {
    console.error("Migration failed:", error);
  }
}

main().catch(console.error);
