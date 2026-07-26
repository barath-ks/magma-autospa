import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

async function main() {
  console.log("Adding must_change_password column...");

  try {
    await db.execute(`
      ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0;
    `);
    console.log("Migration successful: must_change_password column added.");
  } catch (error: any) {
    if (error.message.includes("duplicate column name")) {
      console.log("Column already exists. Skipping.");
    } else {
      console.error("Migration failed:", error);
    }
  }
}

main().catch(console.error);
