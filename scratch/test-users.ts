import { db } from "../lib/db";
async function test() {
  const id = 'branch-1';
  const res = await db.execute({
    sql: `SELECT id, login_id, name, role FROM users WHERE branch_id = ? AND role IN ('staff', 'manager') AND is_active = 1`,
    args: [id]
  });
  console.log(res.rows);
}
test();
