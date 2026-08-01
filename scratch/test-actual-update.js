const { createClient } = require("@libsql/client");
const db = createClient({ url: "file:local.db" });

async function main() {
  const serviceId = 'b6e2cd4f-e237-4427-b077-c8f21c40b539'; // Basic Wash
  
  const name = "Basic Wash";
  const description = "";
  const price = 600;
  const is_active = false;

  try {
    const existing = await db.execute({
      sql: `SELECT id FROM services WHERE LOWER(name) = LOWER(?) AND id != ?`,
      args: [name.trim(), serviceId]
    });
    
    if (existing.rows.length > 0) {
      console.log("Duplicate name error");
      return;
    }

    const updates = [];
    const args = [];
    
    updates.push("name = ?"); args.push(name);
    updates.push("description = ?"); args.push(description);
    updates.push("price = ?"); args.push(Number(price));
    updates.push("is_active = ?"); args.push(is_active ? 1 : 0);

    args.push(serviceId);

    const query = `UPDATE services SET ${updates.join(", ")} WHERE id = ?`;
    console.log("Executing Query:", query, args);
    
    const res = await db.execute({
      sql: query,
      args
    });
    
    console.log("Success:", res);

  } catch (err) {
    console.error("Caught Exception:", err.message);
  }
}

main().catch(console.error);
