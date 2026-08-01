import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

async function main() {
  const serviceId = 'b6e2cd4f-e237-4427-b077-c8f21c40b539'; // Basic Wash
  
  // We'll mimic the PATCH route logic directly to catch the exception,
  // or use fetch against localhost if server is running.
  // Since server might not be running or we don't have session cookies,
  // we'll run the exact DB query the PATCH route runs to see why it fails.

  const name = "Basic Wash Edited";
  const description = "";
  const price = 600;
  const is_active = true;

  try {
    // Exact logic from app/api/admin/services/[id]/route.ts
    const existing = await db.execute({
      sql: `SELECT id FROM services WHERE LOWER(name) = LOWER(?) AND id != ?`,
      args: [name.trim(), serviceId]
    });
    
    if (existing.rows.length > 0) {
      console.log("Duplicate name error");
      return;
    }

    const updates = [];
    const args: any[] = [];
    
    updates.push("name = ?"); args.push(name);
    updates.push("description = ?"); args.push(description);
    updates.push("price = ?"); args.push(Number(price));
    updates.push("is_active = ?"); args.push(is_active ? 1 : 0);

    if (updates.length === 0) {
      console.log("No updates");
      return;
    }

    args.push(serviceId);

    const query = `UPDATE services SET ${updates.join(", ")} WHERE id = ?`;
    console.log("Executing Query:", query, args);
    
    const res = await db.execute({
      sql: query,
      args
    });
    
    console.log("Success:", res);

  } catch (err) {
    console.error("Caught Exception:", err);
  }
}

main().catch(console.error);
