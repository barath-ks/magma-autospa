import { db } from "../lib/db";

async function run() {
  const res = await db.execute("SELECT id, status, staff_id FROM transactions WHERE status = 'in_progress' OR status = 'finished'");
  console.log("Found jobs:");
  console.table(res.rows);
}

run();
