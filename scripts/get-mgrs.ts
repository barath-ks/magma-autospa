import { db } from "../lib/db";

async function run() {
  const result = await db.execute(`
    SELECT u.login_id, u.name as manager_name, b.name as branch_name 
    FROM users u 
    JOIN branches b ON u.branch_id = b.id 
    WHERE u.role = 'manager' AND b.name LIKE '%Branch 2%'
  `);
  console.log("Managers for Branch 2:");
  console.log(JSON.stringify(result.rows, null, 2));

  if (result.rows.length === 0) {
    const all = await db.execute(`
      SELECT u.login_id, u.name as manager_name, b.name as branch_name 
      FROM users u 
      JOIN branches b ON u.branch_id = b.id 
      WHERE u.role = 'manager'
    `);
    console.log("All Managers:");
    console.log(JSON.stringify(all.rows, null, 2));
  }
}

run().catch(console.error);
