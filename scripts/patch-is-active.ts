import { db } from "../lib/db";

async function run() {
  try {
    // Add is_active to branches
    await db.execute("ALTER TABLE branches ADD COLUMN is_active BOOLEAN DEFAULT 1");
    console.log("Added is_active to branches");
  } catch (e: any) {
    if (!e.message.includes("duplicate column name")) {
      console.error(e);
    } else {
      console.log("is_active already exists on branches");
    }
  }

  try {
    // Add is_active to users
    await db.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1");
    console.log("Added is_active to users");
  } catch (e: any) {
    if (!e.message.includes("duplicate column name")) {
      console.error(e);
    } else {
      console.log("is_active already exists on users");
    }
  }
}
run();
