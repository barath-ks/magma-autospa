import { db } from "../lib/db";

async function run() {
  const res = await db.execute("SELECT id, status, staff_id FROM transactions LIMIT 10");
  console.log("All transactions:");
  console.table(res.rows);
}

run();
