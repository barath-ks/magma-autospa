const { createClient } = require("@libsql/client");

async function runTests() {
  const db = createClient({ url: process.env.LIBSQL_URL || "file:local.db" });
  const branches = await db.execute("SELECT id, name FROM branches");
  const downtownBranch = branches.rows.find(b => b.name === "Main Branch")?.id;
  const uptownBranch = branches.rows.find(b => b.name === "Branch 2")?.id;
  
  const customers = await db.execute(`SELECT id FROM customers WHERE branch_id = '${downtownBranch}' LIMIT 1`);
  const targetCustomer = customers.rows[0]?.id;

  // Manager of Downtown (Same branch)
  const headersDowntown = {
    "Content-Type": "application/json",
    "x-test-role": "manager",
    "x-test-branch-id": downtownBranch
  };

  // Manager of Uptown (Cross branch)
  const headersUptown = {
    "Content-Type": "application/json",
    "x-test-role": "manager",
    "x-test-branch-id": uptownBranch
  };

  console.log("=== 1. Editing name/phone/email/vehicle info as Staff (Manager) — confirm it persists ===");
  const res1 = await fetch(`http://localhost:3000/api/staff/customers/${targetCustomer}`, {
    method: "PATCH",
    headers: headersDowntown,
    body: JSON.stringify({ name: "John Doe Updated", phone: "555-9999", email: "john.updated@example.com", vehicle_number: "ABC-1234", vehicle_model: "Honda Civic" }),
  });
  console.log("Status:", res1.status);
  console.log("Response:", await res1.json());
  
  // Verify it persisted
  const getRes = await fetch(`http://localhost:3000/api/staff/customers/${targetCustomer}`, { headers: headersDowntown });
  const getData = await getRes.json();
  console.log("Database Verification ->", getData.customer ? `Name: ${getData.customer.name} | Email: ${getData.customer.email}` : "Customer not found");

  console.log("\n=== 2. Attempting to include points_balance: 9999 in the payload — confirm 400 rejection ===");
  const res2 = await fetch(`http://localhost:3000/api/staff/customers/${targetCustomer}`, {
    method: "PATCH",
    headers: headersDowntown,
    body: JSON.stringify({ name: "John Doe", phone: "555-1111", email: "john@example.com", points_balance: 9999 }),
  });
  console.log("Status:", res2.status);
  console.log("Response:", await res2.json());

  console.log("\n=== 3. Attempting to remove/empty the email field — confirm 400 rejection ===");
  const res3 = await fetch(`http://localhost:3000/api/staff/customers/${targetCustomer}`, {
    method: "PATCH",
    headers: headersDowntown,
    body: JSON.stringify({ name: "John Doe", phone: "555-1111", email: "" }),
  });
  console.log("Status:", res3.status);
  console.log("Response:", await res3.json());

  console.log("\n=== 4. A Manager from Branch A attempting to PATCH a customer in Branch B — confirm 403 rejection ===");
  // Uptown manager editing Downtown customer
  const res4 = await fetch(`http://localhost:3000/api/staff/customers/${targetCustomer}`, {
    method: "PATCH",
    headers: headersUptown,
    body: JSON.stringify({ name: "John Doe", phone: "555-1111", email: "john@example.com" }),
  });
  console.log("Status:", res4.status);
  console.log("Response:", await res4.json());
}

runTests();
