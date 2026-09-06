import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

async function check() {
  const branches = await db.execute("SELECT id, name FROM branches");
  
  console.log("Branches list:");
  for (const b of branches.rows) {
    if (b.id === 'branch-1' || b.id === 'branch-2' || b.name === 'branch-1' || b.name === 'branch-2' || b.name === 'Main Branch' || b.name === 'Secondary Branch') {
      console.log(`- ID: ${b.id} | Name: ${b.name} -> KEEP`);
      continue;
    }

    const tables = ['transactions', 'users', 'expenses', 'redemptions', 'schedule_requests', 'profile_change_requests', 'customers', 'offers'];
    let hasData = false;
    const details = [];

    for (const table of tables) {
      try {
        const res = await db.execute({
          sql: `SELECT COUNT(*) as count FROM ${table} WHERE branch_id = ?`,
          args: [b.id]
        });
        const count = res.rows[0].count;
        if (Number(count) > 0) {
          hasData = true;
          details.push(`${table}: ${count}`);
        }
      } catch(e: any) {
        // some tables might not have branch_id or not exist
        if (e.message.includes('no column named branch_id')) {
           // ignore
        } else {
           console.log("Error on table", table, e.message);
        }
      }
    }

    console.log(`- ID: ${b.id} | Name: ${b.name}`);
    if (hasData) {
      console.log(`  -> HAS DATA: ${details.join(', ')}`);
    } else {
      console.log(`  -> EMPTY (Safe to hard-delete)`);
    }
  }
}

check().catch(console.error);
