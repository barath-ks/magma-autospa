const { createClient } = require('@libsql/client');
const crypto = require('crypto');

const db = createClient({ url: 'file:local.db' });

async function test() {
  try {
    const id = crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO otp_codes (id, user_id, channel, code_hash, purpose, expires_at) VALUES (?, 'non-existent-user-id', 'email', 'hash', 'redemption', datetime('now', '+10 minutes'))",
      args: [id]
    });
    console.log("Inserted successfully (FK not enforced)");
    await db.execute({ sql: "DELETE FROM otp_codes WHERE id = ?", args: [id] });
  } catch (e) {
    console.error("Failed to insert (FK enforced?):", e.message);
  }
}
test();
