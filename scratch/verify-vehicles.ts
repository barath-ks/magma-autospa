import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const BASE_URL = "http://localhost:3000";

async function verify() {
  console.log("=== VERIFICATION START ===\n");

  const db = createClient({ url: "file:local.db" });

  try {
    // 1. Verify migration count
    const vehicleCountRes = await db.execute("SELECT COUNT(*) as count FROM vehicles");
    console.log(`[1] Migration Verification: ${vehicleCountRes.rows[0].count} vehicles in the database.\n`);

    // Setup test data
    // Find a manager in branch 1 and a manager in branch 2
    const mgr1Res = await db.execute(`SELECT u.login_id, b.id as branch_id FROM users u JOIN branches b ON u.branch_id = b.id WHERE u.role = 'manager' LIMIT 1`);
    const mgr2Res = await db.execute(`SELECT u.login_id, b.id as branch_id FROM users u JOIN branches b ON u.branch_id = b.id WHERE u.role = 'manager' AND b.id != ? LIMIT 1`, [mgr1Res.rows[0].branch_id]);
    
    if (mgr1Res.rows.length === 0 || mgr2Res.rows.length === 0) {
      console.log("Missing managers to test branch isolation.");
      return;
    }
    
    const mgr1 = mgr1Res.rows[0];
    const mgr2 = mgr2Res.rows[0];
    
    // Create a test customer in branch 1
    const custRes = await db.execute({
      sql: `INSERT INTO customers (id, name, phone, email, branch_id) VALUES ('test-cust-1', 'Test Cust 1', '9999999991', 'test1@test.com', ?) RETURNING id`,
      args: [mgr1.branch_id]
    });
    const customerId = custRes.rows[0].id;
    
    // Create a vehicle for customer 1
    await db.execute({
      sql: `INSERT INTO vehicles (id, customer_id, vehicle_number, vehicle_type, vehicle_model) VALUES ('test-veh-1', ?, 'TEST0001', 'sedan', 'Honda City')`,
      args: [customerId]
    });
    
    // Create a test customer in branch 2
    const cust2Res = await db.execute({
      sql: `INSERT INTO customers (id, name, phone, email, branch_id) VALUES ('test-cust-2', 'Test Cust 2', '9999999992', 'test2@test.com', ?) RETURNING id`,
      args: [mgr2.branch_id]
    });
    const customer2Id = cust2Res.rows[0].id;
    
    // Create a vehicle for customer 2
    await db.execute({
      sql: `INSERT INTO vehicles (id, customer_id, vehicle_number, vehicle_type, vehicle_model) VALUES ('test-veh-2', ?, 'TEST0002', 'suv', 'Tata Safari')`,
      args: [customer2Id]
    });

    // Fetch CSRF Token
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const csrfCookie = csrfRes.headers.get("set-cookie")?.split(";")[0];
    
    // Log in as manager 1
    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': csrfCookie || "" },
      body: new URLSearchParams({
        csrfToken: csrfToken, 
        login_id: String(mgr1.login_id), 
        password: 'password123', 
        redirect: 'false',
        json: 'true'
      })
    });
    
    const rawSetCookie = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get("set-cookie")];
    const sessionCookie = rawSetCookie.find((c: any) => c && (c.includes("next-auth.session-token") || c.includes("__Secure-next-auth.session-token")));
    if (!sessionCookie) {
        console.log("Failed to get manager session cookie.");
        return;
    }
    const finalCookie = sessionCookie.split(";")[0];
    const fullCookie = `${csrfCookie}; ${finalCookie}`;

    // 2. Verify branch isolation (API)
    console.log("[2] Branch Isolation Verification:");
    console.log("  Attempting to patch a vehicle belonging to a customer in Branch 2, using Branch 1 Manager session...");
    const patchRes = await fetch(`${BASE_URL}/api/manager/vehicles/test-veh-2`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Cookie": fullCookie },
      body: JSON.stringify({ vehicle_model: "Hacked" })
    });
    
    console.log(`  Response Status: ${patchRes.status}`);
    if (patchRes.status === 403) {
      console.log("  Success: Access Forbidden (403). Branch isolation working.");
    } else {
      console.log("  Failed: Expected 403, got " + patchRes.status);
      console.log(await patchRes.text());
    }
    console.log("");
    
    // 3. Verify Unique Vehicle Number Constraint
    console.log("[3] Unique Constraint Verification:");
    console.log("  Attempting to create a new vehicle with an existing number ('TEST0001')...");
    const addVehRes = await fetch(`${BASE_URL}/api/manager/customers/${customerId}/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": fullCookie },
      body: JSON.stringify({ vehicle_number: "TEST0001", vehicle_type: "hatchback", vehicle_model: "i20" })
    });
    
    console.log(`  Response Status: ${addVehRes.status}`);
    if (addVehRes.status === 400) {
      const data = await addVehRes.json();
      console.log(`  Success: Constraint Caught (400) - Message: ${data.error}`);
    } else {
      console.log("  Failed: Expected 400, got " + addVehRes.status);
      console.log(await addVehRes.text());
    }
    console.log("");
    
    // 4. Verify transaction logging with vehicle_id
    console.log("[4] Transaction Logging Verification:");
    console.log("  Attempting to create a transaction with a valid vehicle_id...");
    
    // get a service
    const serviceRes = await db.execute("SELECT id FROM services LIMIT 1");
    const serviceId = serviceRes.rows[0].id;
    
    const trxRes = await fetch(`${BASE_URL}/api/manager/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": fullCookie },
      body: JSON.stringify({ customer_id: customerId, service_ids: [serviceId], vehicle_id: 'test-veh-1' })
    });
    
    console.log(`  Response Status: ${trxRes.status}`);
    if (trxRes.ok) {
      console.log("  Success: Transaction API returned OK.");
      // Check DB for transaction snapshot
      const dbCheck = await db.execute("SELECT vehicle_id, vehicle_number, vehicle_model FROM transactions WHERE customer_id = 'test-cust-1' ORDER BY created_at DESC LIMIT 1");
      if (dbCheck.rows.length > 0) {
        console.log(`  DB Verification: vehicle_id='${dbCheck.rows[0].vehicle_id}', vehicle_number='${dbCheck.rows[0].vehicle_number}', vehicle_model='${dbCheck.rows[0].vehicle_model}'`);
        console.log("  Transaction successfully snapshotted vehicle data.");
      } else {
        console.log("  Failed: Transaction not found in DB.");
      }
    } else {
      console.log("  Failed: Transaction API returned " + trxRes.status);
      console.log(await trxRes.text());
    }
    console.log("");
    
    // Cleanup test data
    console.log("Cleaning up test data...");
    await db.execute("DELETE FROM transactions WHERE customer_id IN ('test-cust-1', 'test-cust-2')");
    await db.execute("DELETE FROM vehicles WHERE customer_id IN ('test-cust-1', 'test-cust-2')");
    await db.execute("DELETE FROM loyalty_points_ledger WHERE customer_id IN ('test-cust-1', 'test-cust-2')");
    await db.execute("DELETE FROM customers WHERE id IN ('test-cust-1', 'test-cust-2')");
    console.log("Done.");

    console.log("\n=== VERIFICATION COMPLETE ===");
  } catch (e) {
    console.error(e);
  } finally {
    db.close();
  }
}

verify();
