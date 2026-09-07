import "dotenv/config";
import { db } from "../lib/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding test users...");

  const client = await db.connect();
  try {
    // 1. Create a dummy branch first
    const branchId = "branch-1";
    await client.query(
      `INSERT INTO branches (id, name, location)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [branchId, "Main Branch", "Downtown"]
    );

    // 2. Hash password "password123"
    const passwordHash = await bcrypt.hash("password123", 10);

    // 3. Insert Admin
    await client.query(
      `INSERT INTO users (id, login_id, email, password_hash, role, name, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      ["admin-1", "ADM-0001", "admin@magma.com", passwordHash, "admin", "Admin User", null]
    );

    // 4. Insert Manager
    await client.query(
      `INSERT INTO users (id, login_id, email, password_hash, role, name, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      ["manager-1", "MGR-0001", "manager@magma.com", passwordHash, "manager", "Manager User", branchId]
    );

    // 5. Insert Staff
    await client.query(
      `INSERT INTO users (id, login_id, email, password_hash, role, name, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      ["staff-1", "MAG-0001", "staff@magma.com", passwordHash, "staff", "Staff User", branchId]
    );

    console.log("Seeding complete. You can log in with:");
    console.log("  Admin:   ADM-0001 / password123");
    console.log("  Manager: MGR-0001 / password123");
    console.log("  Staff:   MAG-0001 / password123");
  } catch (err) {
    console.error("Error seeding users:", err);
    process.exit(1);
  } finally {
    client.release();
    await db.end();
  }
}

seed();
