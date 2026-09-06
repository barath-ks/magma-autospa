import { createClient } from "@libsql/client";

async function run() {
  const db = createClient({ url: "file:local.db" });
  try {
    const serviceOffers = await db.execute(`
      SELECT so.id, so.service_id, s.name as service_name, s.branch_id as service_branch
      FROM service_offers so
      LEFT JOIN services s ON so.service_id = s.id
    `);
    console.log("Service Offers Relations:", serviceOffers.rows);

    const combos = await db.execute(`
      SELECT c.id, c.name, cs.service_id, s.name as service_name, s.branch_id as service_branch
      FROM combos c
      LEFT JOIN combo_services cs ON c.id = cs.combo_id
      LEFT JOIN services s ON cs.service_id = s.id
    `);
    console.log("Combos Relations:", combos.rows);

  } catch (e) {
    console.error(e);
  } finally {
    db.close();
  }
}
run();
