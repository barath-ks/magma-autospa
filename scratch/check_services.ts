import { createClient } from "@libsql/client";

async function run() {
  const db = createClient({ url: "file:local.db" });
  try {
    const branches = await db.execute("SELECT id, name FROM branches");
    console.log("Branches:", branches.rows);

    const services = await db.execute("SELECT id, name FROM services");
    console.log("Services:", services.rows.length);

    // Find which branches use which services
    const usage = await db.execute(`
      SELECT s.name, t.branch_id, b.name as branch_name, COUNT(*) as usage_count
      FROM services s
      LEFT JOIN transaction_services ts ON s.id = ts.service_id
      LEFT JOIN transactions t ON ts.transaction_id = t.id
      LEFT JOIN branches b ON t.branch_id = b.id
      GROUP BY s.id, t.branch_id
      ORDER BY s.name
    `);
    
    console.log("Service Usage by Branch:");
    console.table(usage.rows);
  } catch (e) {
    console.error(e);
  } finally {
    db.close();
  }
}

run();
