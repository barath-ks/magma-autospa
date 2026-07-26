import { db } from "../lib/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding test users...");

  try {
    // 1. Create a dummy branch first
    const branchId = "branch-1";
    await db.execute({
      sql: `INSERT OR IGNORE INTO branches (id, name, location) VALUES (?, ?, ?)`,
      args: [branchId, "Main Branch", "Downtown"],
    });

    // 2. Hash password "password123"
    const passwordHash = await bcrypt.hash("password123", 10);

    // 3. Insert Admin
    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, login_id, email, password_hash, role, branch_id) VALUES (?, ?, ?, ?, ?, ?)`,
      args: ["admin-1", "ADM-0001", "admin@magma.com", passwordHash, "admin", null],
    });

    // 4. Insert Manager
    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, login_id, email, password_hash, role, branch_id) VALUES (?, ?, ?, ?, ?, ?)`,
      args: ["manager-1", "MGR-0001", "manager@magma.com", passwordHash, "manager", branchId],
    });

    // 5. Insert Staff
    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, login_id, email, password_hash, role, branch_id) VALUES (?, ?, ?, ?, ?, ?)`,
      args: ["staff-1", "MAG-0001", "staff@magma.com", passwordHash, "staff", branchId],
    });

    console.log("Seeding complete. You can log in with:");
    console.log("Admin: ADM-0001 / password123");
    console.log("Manager: MGR-0001 / password123");
    console.log("Staff: MAG-0001 / password123");
  } catch (err) {
    console.error("Error seeding users:", err);
  }
}

seed();
