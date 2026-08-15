import { createClient } from "@libsql/client";
import * as crypto from "crypto";

// We'll test against the running dev server (http://localhost:3000)
const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== VERIFYING STAFF LOGIN REMOVAL AND MANAGER CONSOLIDATION ===");

  const db = createClient({ url: "file:local.db" });

  try {
    // 1. Setup Data
    // Ensure we have a staff user and a manager user
    let staffRes = await db.execute("SELECT * FROM users WHERE role = 'staff' LIMIT 1");
    let managerRes = await db.execute("SELECT * FROM users WHERE role = 'manager' LIMIT 1");
    
    if (staffRes.rows.length === 0 || managerRes.rows.length === 0) {
      console.log("Need both a staff and a manager in DB to test. Existing roles:");
      const allRoles = await db.execute("SELECT role, count(*) as count FROM users GROUP BY role");
      console.log(allRoles.rows);
      return;
    }

    const staffUser = staffRes.rows[0];
    const managerUser = managerRes.rows[0];

    // Get CSRF Token
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const csrfCookie = csrfRes.headers.get("set-cookie")?.split(";")[0];

    console.log(`\n--- Test 1: Staff Login Attempt ---`);
    console.log(`Attempting to login as Staff (${staffUser.login_id})`);
    
    // We send a POST to credentials provider
    const staffLoginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Cookie": csrfCookie || "" },
      body: new URLSearchParams({
        login_id: String(staffUser.login_id),
        password: "password123",
        csrfToken: csrfToken,
        redirect: "false",
        json: "true"
      })
    });
    const staffLoginData = await staffLoginRes.json();
    console.log("Response:", staffLoginData);
    if (staffLoginData.url && (staffLoginData.url.includes("error") || staffLoginData.url.includes("signin"))) {
      console.log("✅ SUCCESS: Staff login rejected (redirected to signin/error).");
    } else {
      console.log("❌ FAILED: Staff login succeeded when it should have failed.");
    }

    console.log(`\n--- Test 2: Manager End-to-End Flow ---`);
    console.log(`Logging in as Manager (${managerUser.login_id})...`);
    
    const managerLoginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Cookie": csrfCookie || "" },
      body: new URLSearchParams({
        login_id: String(managerUser.login_id),
        password: "password123",
        csrfToken: csrfToken,
        redirect: "false",
        json: "true"
      })
    });
    
    const rawSetCookie = managerLoginRes.headers.getSetCookie ? managerLoginRes.headers.getSetCookie() : [managerLoginRes.headers.get("set-cookie")];
    const sessionCookie = rawSetCookie.find((c: any) => c && (c.includes("next-auth.session-token") || c.includes("__Secure-next-auth.session-token")));
    
    if (!sessionCookie) {
      console.log("Failed to get manager session cookie. Cookies were:", rawSetCookie);
      return;
    }
    const finalCookie = sessionCookie.split(";")[0];
    console.log("Manager authenticated successfully.");

    // Fetch a customer or create one
    let customerRes = await db.execute("SELECT id FROM customers LIMIT 1");
    if (customerRes.rows.length === 0) {
      await db.execute("INSERT INTO customers (id, name, phone) VALUES ('cust-1', 'Test Customer', '555-0100')");
      customerRes = await db.execute("SELECT id FROM customers LIMIT 1");
    }
    const customerId = customerRes.rows[0].id;

    // Fetch a service
    let serviceRes = await db.execute("SELECT id FROM services LIMIT 1");
    const serviceId = serviceRes.rows[0].id;

    console.log("Step A: Manager creating a job...");
    const createJobRes = await fetch(`${BASE_URL}/api/manager/transactions`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": finalCookie
      },
      body: JSON.stringify({
        customer_id: customerId,
        service_ids: [serviceId]
      })
    });
    const createJobData = await createJobRes.json();
    console.log("Create Job Response:", createJobData);
    
    // We get the transaction from DB since API doesn't return ID directly
    const txRes = await db.execute(`SELECT id FROM transactions WHERE customer_id = '${customerId}' ORDER BY created_at DESC LIMIT 1`);
    const txId = txRes.rows[0].id;

    console.log("Step B: Manager finishing the job (claims and finishes)...");
    const finishJobRes = await fetch(`${BASE_URL}/api/manager/jobs/active`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": finalCookie
      },
      body: JSON.stringify({
        id: txId,
        status: "finished"
      })
    });
    const finishJobData = await finishJobRes.json();
    console.log("Finish Job Response:", finishJobData);

    // Give some points artificially to test redemption if they don't have enough
    await db.execute(`UPDATE customers SET points_balance = 5000 WHERE id = '${customerId}'`);

    console.log("Step C: Manager triggering a redemption (Request OTP)...");
    let offerRes = await db.execute("SELECT id FROM service_offers LIMIT 1");
    if (offerRes.rows.length === 0) {
      await db.execute(`INSERT INTO service_offers (id, service_id, offer_price) VALUES ('off-1', '${serviceId}', 10)`);
      offerRes = await db.execute("SELECT id FROM service_offers LIMIT 1");
    }
    const offerId = offerRes.rows[0].id;

    const requestOtpRes = await fetch(`${BASE_URL}/api/manager/redemptions/request-otp`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": finalCookie
      },
      body: JSON.stringify({
        customer_id: customerId,
        offer_id: offerId
      })
    });
    const requestOtpData = await requestOtpRes.json();
    console.log("Request OTP Response:", requestOtpData);

    console.log(`\n--- Test 3: Historical Data Integrity ---`);
    console.log("Checking transactions table to ensure past staff assignments remain visible...");
    const historicalRes = await db.execute(`
      SELECT t.id, t.staff_id, u.name as staff_name, u.role
      FROM transactions t
      JOIN users u ON t.staff_id = u.id
      WHERE u.role = 'staff'
      LIMIT 1
    `);
    
    if (historicalRes.rows.length > 0) {
      console.log("Found historical transaction linked to a staff member:");
      console.log(historicalRes.rows[0]);
      console.log("✅ SUCCESS: Historical links to staff accounts are intact.");
    } else {
      console.log("No historical transactions assigned to staff found in this test DB.");
    }

  } catch (err) {
    console.error("Error during tests:", err);
  } finally {
    db.close();
  }
}

runTests();
