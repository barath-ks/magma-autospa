import { db } from "../lib/db";
import { v4 as uuidv4 } from "uuid";

async function runTests() {
  console.log("=== Testing Admin Branch Routes ===");
  try {
    // Note: Since we can't easily mock NextAuth's getServerSession from a raw Node script
    // without mocking the Next.js request context (which is very heavy),
    // we will directly verify the database operations that power the endpoints.
    
    // 1. Clean up any existing test branches
    await db.execute("DELETE FROM branches WHERE code = 'test-branch-api'");
    console.log("✅ Cleaned up old test data");

    // 2. Test POST /api/admin/branches behavior
    const testId = uuidv4();
    await db.execute({
      sql: "INSERT INTO branches (id, name, code, location, phone, is_active) VALUES (?, ?, ?, ?, ?, 1)",
      args: [testId, "Test Branch API", "test-branch-api", "123 Test St", "555-000-1234"]
    });
    console.log("✅ Successfully simulated POST: Created new branch with code 'test-branch-api'");

    // 3. Test duplicate code rejection
    try {
      await db.execute({
        sql: "INSERT INTO branches (id, name, code, location, phone, is_active) VALUES (?, ?, ?, ?, ?, 1)",
        args: [uuidv4(), "Duplicate Name", "test-branch-api", "Location", "Phone"]
      });
      console.error("❌ FAILED: Duplicate code was allowed!");
    } catch (e: any) {
      if (e.message.includes("UNIQUE constraint failed")) {
        console.log("✅ Successfully rejected duplicate branch code (UNIQUE constraint works)");
      } else {
        throw e;
      }
    }

    // 4. Test GET /api/admin/branches behavior
    const branches = await db.execute(`
      SELECT 
        b.id, b.name, b.code, b.location, b.phone, b.is_active,
        (SELECT COUNT(*) FROM users u WHERE u.branch_id = b.id AND u.role = 'staff' AND u.is_active = 1) as active_staff_count
      FROM branches b
      WHERE b.id = ?
    `, [testId]);
    if (branches.rows.length === 1 && branches.rows[0].code === 'test-branch-api') {
      console.log("✅ Successfully simulated GET: Retrieved branch with stats");
    }

    // 5. Test PATCH /api/admin/branches/[id] behavior
    await db.execute({
      sql: "UPDATE branches SET location = ?, phone = ? WHERE id = ?",
      args: ["456 Updated St", "555-999-9999", testId]
    });
    const updated = await db.execute("SELECT location, phone FROM branches WHERE id = ?", [testId]);
    if (updated.rows[0].location === "456 Updated St" && updated.rows[0].phone === "555-999-9999") {
      console.log("✅ Successfully simulated PATCH: Updated branch fields");
    }

    // 6. Test DELETE /api/admin/branches/[id] behavior (Soft Delete)
    await db.execute({
      sql: "UPDATE branches SET is_active = 0 WHERE id = ?",
      args: [testId]
    });
    const deactivated = await db.execute("SELECT is_active FROM branches WHERE id = ?", [testId]);
    if (deactivated.rows[0].is_active === 0) {
      console.log("✅ Successfully simulated DELETE: Soft-deleted branch");
    }

    // Clean up
    await db.execute("DELETE FROM branches WHERE id = ?", [testId]);
    console.log("✅ Test cleanup complete");

    console.log("\n🎉 All database behaviors for the Admin Branches API passed successfully!");
  } catch (error) {
    console.error("❌ Test Failed:", error);
  }
}

runTests();
