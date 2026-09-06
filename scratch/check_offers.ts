import { createClient } from "@libsql/client";

async function run() {
  const db = createClient({ url: "file:local.db" });
  try {
    const serviceOffers = await db.execute("SELECT id, service_id, branch_id FROM service_offers");
    console.log("Service Offers:", serviceOffers.rows);

    const combos = await db.execute("SELECT id, name, branch_id FROM combos");
    console.log("Combos:", combos.rows);

  } catch (e) {
    console.error(e);
  } finally {
    db.close();
  }
}
run();
