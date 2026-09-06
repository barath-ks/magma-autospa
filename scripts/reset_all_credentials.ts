import { db } from "../lib/db";
import bcrypt from "bcryptjs";

const ROLE_PASSWORDS = {
  admin: "Admin@Magma2026!",
  manager: "Manager@Magma2026!",
  staff: "Staff@Magma2026!",
};

async function resetCredentials() {
  console.log("Starting credential reset process...");
  
  try {
    // 1. Fetch all users
    const result = await db.execute(`
      SELECT u.id, u.login_id, u.name, u.role, b.name as branch_name 
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
    `);
    const users = result.rows;
    
    if (users.length === 0) {
      console.log("No users found.");
      return;
    }

    const summary: any[] = [];
    const txn = await db.transaction("write");

    try {
      // 2. Iterate and hash
      for (const user of users) {
        const role = user.role as keyof typeof ROLE_PASSWORDS;
        const plainTextPassword = ROLE_PASSWORDS[role] || "Staff@Magma2026!";
        
        // Hash with standard 12 salt rounds
        const hashedPassword = await bcrypt.hash(plainTextPassword, 12);
        
        // Update user
        await txn.execute({
          sql: "UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?",
          args: [hashedPassword, user.id]
        });

        // Add to summary
        summary.push({
          login_id: user.login_id,
          name: user.name,
          role: user.role,
          branch: user.branch_name || "Global",
          temporary_password: plainTextPassword,
          must_change_password: 1
        });
      }

      await txn.commit();
      console.log("\n✅ Reset successfully applied to all users.");
      console.table(summary);
      
    } catch (txnError) {
      await txn.rollback();
      throw txnError;
    }
  } catch (error) {
    console.error("❌ Credential reset failed:", error);
  }
}

resetCredentials();
