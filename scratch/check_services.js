const { createClient } = require("@libsql/client");
const db = createClient({ url: "file:local.db" });

async function check() {
  const services = await db.execute("SELECT id, name, price, is_active FROM services");
  
  console.log("Services list:");
  for (const s of services.rows) {
    const countRes = await db.execute({
      sql: "SELECT COUNT(*) as count FROM transaction_services WHERE service_id = ?",
      args: [s.id]
    });
    console.log(`- ID: ${s.id} | Name: ${s.name} | Price: ${s.price} | Active: ${s.is_active} | Used in transactions: ${countRes.rows[0].count}`);
  }
}

check().catch(console.error);
