import { db } from "../lib/db";
import { v4 as uuidv4 } from "uuid";

async function run() {
  try {
    // 1. Get the first staff user to find their branch_id
    const staffRes = await db.execute("SELECT branch_id FROM users WHERE role = 'staff' LIMIT 1");
    if (staffRes.rows.length === 0) {
      console.log("No staff users found. Cannot create dummy jobs with correct branch_id.");
      return;
    }
    const branchId = staffRes.rows[0].branch_id;

    // 2. Get a customer, or create one if none exist
    let customerId;
    const custRes = await db.execute("SELECT id FROM customers LIMIT 1");
    if (custRes.rows.length === 0) {
      customerId = uuidv4();
      await db.execute({
        sql: "INSERT INTO customers (id, name, phone, vehicle_model, vehicle_number, branch_id) VALUES (?, ?, ?, ?, ?, ?)",
        args: [customerId, "John Doe", "555-0100", "Porsche 911 GT3", "GT3-4092", branchId]
      });
      console.log("Created dummy customer.");
    } else {
      customerId = custRes.rows[0].id;
    }

    // 3. Create dummy transactions (jobs)
    const tx1 = uuidv4();
    await db.execute({
      sql: "INSERT INTO transactions (id, customer_id, branch_id, total_amount, points_awarded, status) VALUES (?, ?, ?, ?, ?, ?)",
      args: [tx1, customerId, branchId, 1500.0, 150, "pending"]
    });

    const tx2 = uuidv4();
    await db.execute({
      sql: "INSERT INTO transactions (id, customer_id, branch_id, total_amount, points_awarded, status) VALUES (?, ?, ?, ?, ?, ?)",
      args: [tx2, customerId, branchId, 250.0, 25, "pending"]
    });

    console.log("Successfully created 2 dummy jobs (transactions) for branch:", branchId);
  } catch (error) {
    console.error("Error seeding dummy jobs:", error);
  }
}

run();
