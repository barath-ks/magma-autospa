import { db } from "../lib/db";

async function run() {
  const sql = `
      SELECT 
        b.id as branch_id,
        b.name as branch_name,
        b.location as location,
        COALESCE(SUM(t.total_amount), 0) as revenue,
        COALESCE(
          (SELECT SUM(amount) FROM branch_expenses e WHERE e.branch_id = b.id AND e.created_at >= datetime('now', '-1 month')),
          0
        ) as expense
      FROM branches b
      LEFT JOIN transactions t ON t.branch_id = b.id AND t.created_at >= datetime('now', '-1 month')
      WHERE b.id = 'branch-1'
      GROUP BY b.id, b.name ORDER BY b.name ASC
  `;
  const r = await db.execute(sql);
  console.log("Admin Financials Query Result:", r.rows);
  
  const b = await db.execute("SELECT * FROM branches WHERE id = 'branch-1'");
  console.log("Branch directly:", b.rows);
}
run();
