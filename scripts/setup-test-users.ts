import { db } from "../lib/db";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

async function run() {
  const hash = await bcrypt.hash("password", 10);
  
  const branch1 = "branch-1";
  const branch2 = "branch-2";

  // Create branches if not exist
  await db.execute("INSERT OR IGNORE INTO branches (id, name, location) VALUES ('branch-1', 'Branch 1', 'Loc 1')");
  await db.execute("INSERT OR IGNORE INTO branches (id, name, location) VALUES ('branch-2', 'Branch 2', 'Loc 2')");

  // Create 4 users
  await db.execute("DELETE FROM users WHERE login_id IN ('test_staff_a', 'test_staff_b', 'test_staff_c', 'test_manager')");
  
  const uA = uuidv4();
  const uB = uuidv4();
  const uC = uuidv4();
  const uM = uuidv4();

  await db.execute({ sql: "INSERT INTO users (id, login_id, password_hash, role, branch_id, name) VALUES (?, ?, ?, ?, ?, ?)", args: [uA, 'test_staff_a', hash, 'staff', branch1, 'Staff A'] });
  await db.execute({ sql: "INSERT INTO users (id, login_id, password_hash, role, branch_id, name) VALUES (?, ?, ?, ?, ?, ?)", args: [uB, 'test_staff_b', hash, 'staff', branch1, 'Staff B'] });
  await db.execute({ sql: "INSERT INTO users (id, login_id, password_hash, role, branch_id, name) VALUES (?, ?, ?, ?, ?, ?)", args: [uC, 'test_staff_c', hash, 'staff', branch2, 'Staff C'] });
  await db.execute({ sql: "INSERT INTO users (id, login_id, password_hash, role, branch_id, name) VALUES (?, ?, ?, ?, ?, ?)", args: [uM, 'test_manager', hash, 'manager', branch1, 'Manager'] });

  console.log("Users created.");
}

run();
