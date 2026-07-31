import { db } from "../lib/db";

async function run() {
  const res = await db.execute("SELECT * FROM branch_expenses WHERE description = 'Initial Supplies'");
  console.log("Expense row:", res.rows[0]);
  
  if (res.rows[0]) {
    const userRes = await db.execute({
      sql: "SELECT id, name FROM users WHERE id = ?",
      args: [res.rows[0].entered_by]
    });
    console.log("Joined User:", userRes.rows[0]);
  }
}
run();
