import { createClient } from "@libsql/client";

async function run() {
  const db = createClient({ url: "file:local.db" });
  try {
    const result = await db.execute("SELECT type, name, sql FROM sqlite_master WHERE type='table'");
    result.rows.forEach(r => console.log(r.sql));
  } catch (e) {
    console.error(e);
  } finally {
    db.close();
  }
}

run();
