import { db } from "./lib/db";
import { v4 as uuidv4 } from "uuid";

async function run() {
  try {
    const id = uuidv4();
    await db.execute({ sql: "INSERT INTO customers (id, name, phone, branch_id, points_balance) VALUES (?, 'Test', '123', 'branch', 100)", args: [id] });
    
    const txn = await db.transaction("write");
    const res = await txn.execute({
      sql: "UPDATE customers SET points_balance = points_balance - 10 WHERE id = ? AND points_balance >= 10 RETURNING points_balance",
      args: [id]
    });
    console.log("Returned:", res.rows[0]);
    await txn.commit();
  } catch (e: any) {
    console.error("Failed:", e.message);
  }
}
run();
