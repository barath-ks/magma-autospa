import { db } from "../lib/db";
import { v4 as uuidv4 } from "uuid";

async function run() {
  console.log("Ensuring some points are redeemed for branch-1...");
  const res = await db.execute("SELECT id FROM redemptions WHERE branch_id = 'branch-1' LIMIT 1");
  if (res.rows.length === 0) {
    const custRes = await db.execute("SELECT id FROM customers WHERE branch_id = 'branch-1' LIMIT 1");
    if (custRes.rows.length > 0) {
      const custId = custRes.rows[0].id;
      // Get a valid staff and offer to fulfill constraints
      const staffRes = await db.execute("SELECT id FROM users WHERE branch_id = 'branch-1' LIMIT 1");
      const offerRes = await db.execute("SELECT id FROM offers WHERE branch_id = 'branch-1' LIMIT 1");
      
      if (staffRes.rows.length > 0 && offerRes.rows.length > 0) {
        await db.execute({
          sql: "INSERT INTO redemptions (id, customer_id, branch_id, staff_id, offer_id, points_redeemed, created_at) VALUES (?, ?, 'branch-1', ?, ?, 150, CURRENT_TIMESTAMP)",
          args: [uuidv4(), custId, staffRes.rows[0].id, offerRes.rows[0].id]
        });
        console.log("Inserted 150 points redemption for testing.");
      } else {
        console.log("Missing staff or offer to link redemption to.");
      }
    }
  } else {
    console.log("Points redemption already exists.");
  }
}
run();
