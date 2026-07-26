import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

async function main() {
  console.log("Adding vehicle_number and vehicle_model columns to customers table...");

  try {
    await db.execute(`ALTER TABLE customers ADD COLUMN vehicle_number TEXT;`);
    console.log("Migration successful: vehicle_number column added.");
  } catch (error: any) {
    if (error.message.includes("duplicate column name")) {
      console.log("vehicle_number column already exists. Skipping.");
    } else {
      console.error("Migration failed for vehicle_number:", error);
    }
  }

  try {
    await db.execute(`ALTER TABLE customers ADD COLUMN vehicle_model TEXT;`);
    console.log("Migration successful: vehicle_model column added.");
  } catch (error: any) {
    if (error.message.includes("duplicate column name")) {
      console.log("vehicle_model column already exists. Skipping.");
    } else {
      console.error("Migration failed for vehicle_model:", error);
    }
  }
}

main().catch(console.error);
