import { db } from "../lib/db";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

async function loginAndGetCookie(login_id, password) {
  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
  const csrfData = await csrfRes.json();
  
  const res = await fetch("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": csrfRes.headers.get("set-cookie") || ""
    },
    body: new URLSearchParams({
      login_id,
      password,
      csrfToken: csrfData.csrfToken,
      json: "true"
    })
  });
  
  const cookies = res.headers.get("set-cookie");
  if (!cookies) throw new Error("Login failed, no cookies returned");
  return cookies.split(", ").map(c => c.split(";")[0]).join("; ");
}

async function run() {
  console.log("=== VERIFYING PROFIT MATCH BETWEEN MANAGER AND ADMIN ===");

  const branchRes = await db.execute("SELECT id, name FROM branches LIMIT 1");
  if (branchRes.rows.length === 0) {
    console.log("No branches found.");
    return;
  }
  const branchId = branchRes.rows[0].id as string;
  
  const adminId = uuidv4();
  const managerId = uuidv4();
  
  try {
    const adminPw = await bcrypt.hash("Admin123!", 10);
    const mgrPw = await bcrypt.hash("Mgr123!", 10);
    
    await db.batch([
      { sql: "INSERT INTO users (id, login_id, password_hash, role, name) VALUES (?, ?, ?, 'admin', 'Test Admin')", args: [adminId, 'profit_test_admin', adminPw] },
      { sql: "INSERT INTO users (id, login_id, password_hash, role, branch_id, name) VALUES (?, ?, ?, 'manager', ?, 'Test Mgr')", args: [managerId, 'profit_test_mgr', mgrPw, branchId] }
    ]);
    
    const adminCookie = await loginAndGetCookie("profit_test_admin", "Admin123!");
    const mgrCookie = await loginAndGetCookie("profit_test_mgr", "Mgr123!");
    
    // Test ranges
    for (const range of ["month", "year"]) {
      console.log(`\nTesting range: ${range}`);
      
      // Admin API
      const adminRes = await fetch(`http://localhost:3000/api/admin/branch-financials?branch_id=${branchId}&range=${range}`, {
        headers: { "Cookie": adminCookie }
      });
      const adminData = await adminRes.json();
      const adminFin = adminData.financials[0] || { revenue: 0, expense: 0, profit: 0 };
      
      // Manager API
      const mgrAnaRes = await fetch(`http://localhost:3000/api/manager/analytics?range=${range}`, {
        headers: { "Cookie": mgrCookie }
      });
      const mgrAnaData = await mgrAnaRes.json();
      const mgrRev = mgrAnaData.revenue || 0;
      
      const mgrExpRes = await fetch(`http://localhost:3000/api/manager/expenses?range=${range}`, {
        headers: { "Cookie": mgrCookie }
      });
      const mgrExpData = await mgrExpRes.json();
      const mgrExp = mgrExpData.totalSum || 0;
      
      const mgrProfit = mgrRev - mgrExp;
      
      console.log(`Admin - Rev: ${adminFin.revenue}, Exp: ${adminFin.expense}, Profit: ${adminFin.profit}`);
      console.log(`Mgr   - Rev: ${mgrRev}, Exp: ${mgrExp}, Profit: ${mgrProfit}`);
      
      if (adminFin.revenue !== mgrRev || adminFin.expense !== mgrExp || adminFin.profit !== mgrProfit) {
        throw new Error(`Mismatch detected for range ${range}!`);
      } else {
        console.log(`✅ ${range.toUpperCase()} values match exactly.`);
      }
    }
    
    console.log("\n✅ ALL PROFIT CALCULATIONS MATCH.");

  } catch (e) {
    console.error("Test failed:", e);
  } finally {
    await db.execute({ sql: "DELETE FROM users WHERE id IN (?, ?)", args: [adminId, managerId] });
  }
}

run();
