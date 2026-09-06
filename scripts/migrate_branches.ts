import { db } from "../lib/db";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function run() {
  console.log("Starting branch migration...");
  
  try {
    // 1. Add columns (ignore if already exist)
    try {
      await db.execute("ALTER TABLE branches ADD COLUMN code TEXT;");
      console.log("Added column: code");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) console.log("Column 'code' already exists.");
      else throw e;
    }

    try {
      await db.execute("ALTER TABLE branches ADD COLUMN phone TEXT;");
      console.log("Added column: phone");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) console.log("Column 'phone' already exists.");
      else throw e;
    }

    // 2. Backfill existing rows
    const branches = await db.execute("SELECT id, name FROM branches");
    for (const row of branches.rows) {
      const code = slugify(row.name as string);
      await db.execute({
        sql: "UPDATE branches SET code = ? WHERE id = ? AND code IS NULL",
        args: [code, row.id]
      });
      console.log(`Backfilled branch ${row.name} with code: ${code}`);
    }

    // 3. Create unique index
    await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_code ON branches(code);");
    console.log("Created unique index on branches(code).");

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

run();
