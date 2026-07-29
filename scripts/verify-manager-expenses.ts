import { db } from "../lib/db";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

async function login(loginId: string) {
  const res1 = await fetch("http://localhost:3000/api/auth/csrf");
  const data1 = await res1.json();
  const csrfToken = data1.csrfToken;
  const cookie1 = res1.headers.get("set-cookie") || "";

  const formData = new URLSearchParams();
  formData.append("csrfToken", csrfToken);
  formData.append("login_id", loginId);
  formData.append("password", "password");
  formData.append("json", "true");

  const res2 = await fetch("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookie1
    },
    body: formData.toString()
  });

  const cookies = res2.headers.getSetCookie();
  const cookieHeader = cookies.map(c => c.split(";")[0]).join("; ");
  return cookieHeader;
}

async function run() {
  console.log("Setting up E2E verification for Manager Expenses...");

  // Setup Admin user if not exists
  const hash = await bcrypt.hash("password", 10);
  await db.execute("DELETE FROM users WHERE login_id = 'test_admin'");
  await db.execute({
    sql: "INSERT INTO users (id, login_id, password_hash, role, name) VALUES (?, ?, ?, ?, ?)",
    args: [uuidv4(), 'test_admin', hash, 'admin', 'System Admin']
  });

  const cookieManager1 = await login("test_manager"); // Branch 1
  const cookieManager2 = await login("test_manager_2"); // Branch 2
  const cookieStaffA = await login("test_staff_a"); // Branch 1
  const cookieAdmin = await login("test_admin"); // Admin (no branch)

  console.log("\\n--- 1. Manager Submit & Read (Manager 1) ---");
  const postRes1 = await fetch("http://localhost:3000/api/manager/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": cookieManager1 },
    body: JSON.stringify({ description: "Test Supplies", amount: "55.50" })
  });
  console.log("POST /api/manager/expenses (Manager 1) status:", postRes1.status);
  
  const getRes1 = await fetch("http://localhost:3000/api/manager/expenses?range=month", {
    headers: { "Cookie": cookieManager1 }
  });
  const getData1 = await getRes1.json();
  console.log(`GET (Manager 1) -> Total Sum: $${getData1.totalSum}, Found ${getData1.expenses.length} expenses`);

  console.log("\\n--- 2. Branch Isolation (Manager 2) ---");
  const getRes2 = await fetch("http://localhost:3000/api/manager/expenses?range=month", {
    headers: { "Cookie": cookieManager2 }
  });
  const getData2 = await getRes2.json();
  console.log(`GET (Manager 2) -> Total Sum: $${getData2.totalSum}, Found ${getData2.expenses.length} expenses`);
  if (getData2.totalSum === getData1.totalSum) {
    console.error("FAIL: Branch 2 manager sees Branch 1 expenses!");
  } else {
    console.log("PASS: Branch isolation successful.");
  }

  console.log("\\n--- 3. Staff Block ---");
  const postResStaff = await fetch("http://localhost:3000/api/manager/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": cookieStaffA },
    body: JSON.stringify({ description: "Unauthorized", amount: "10" })
  });
  console.log("POST (Staff A) status:", postResStaff.status, await postResStaff.json());

  console.log("\\n--- 4. Admin Scoping ---");
  const getResAdmin = await fetch("http://localhost:3000/api/manager/expenses?range=month", {
    headers: { "Cookie": cookieAdmin }
  });
  const getDataAdmin = await getResAdmin.json();
  console.log(`GET (Admin - All Branches) -> Total Sum: $${getDataAdmin.totalSum}, Found ${getDataAdmin.expenses.length} expenses`);
  
  const getResAdminB1 = await fetch("http://localhost:3000/api/manager/expenses?range=month&branch_id=branch-1", {
    headers: { "Cookie": cookieAdmin }
  });
  const getDataAdminB1 = await getResAdminB1.json();
  console.log(`GET (Admin - Branch 1) -> Total Sum: $${getDataAdminB1.totalSum}, Found ${getDataAdminB1.expenses.length} expenses`);

  console.log("\\n--- 5. Admin POST Block ---");
  const postResAdmin = await fetch("http://localhost:3000/api/manager/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": cookieAdmin },
    body: JSON.stringify({ description: "Admin Post", amount: "100" })
  });
  console.log("POST (Admin) status:", postResAdmin.status, await postResAdmin.json());

  console.log("\\nVerification complete.");
}

run();
