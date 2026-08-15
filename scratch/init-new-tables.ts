import { createClient } from "@libsql/client";
import { schema } from "../lib/schema";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

async function main() {
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    if (statement.includes("CREATE TABLE IF NOT EXISTS service_offers") || 
        statement.includes("CREATE TABLE IF NOT EXISTS combos") || 
        statement.includes("CREATE TABLE IF NOT EXISTS combo_services")) {
      console.log("Executing:", statement);
      await db.execute(statement);
    }
  }
  console.log("Done");
}

main().catch(console.error);
