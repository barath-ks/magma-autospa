import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const BASE_URL = "http://localhost:3000";

async function verify() {
  console.log("=== VERIFICATION START ===\n");

  const db = createClient({ url: "file:local.db" });

  try {
    // Setup test data
    const mgrRes = await db.execute(`SELECT u.login_id, b.id as branch_id FROM users u JOIN branches b ON u.branch_id = b.id WHERE u.role = 'manager' LIMIT 1`);
    if (mgrRes.rows.length === 0) {
      console.log("Missing manager to test.");
      return;
    }
    const mgr = mgrRes.rows[0];

    // Fetch CSRF Token
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const csrfCookie = csrfRes.headers.get("set-cookie")?.split(";")[0];
    
    // Log in as manager
    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': csrfCookie || "" },
      body: new URLSearchParams({
        csrfToken: csrfToken, 
        login_id: String(mgr.login_id), 
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

    // 1. Confirm a new customer can be created successfully with no email provided.
    console.log("[1] Create Customer (No Email):");
    const createCustomerRes = await fetch(`${BASE_URL}/api/manager/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": fullCookie },
      body: JSON.stringify({ 
        name: "No Email Customer", 
        phone: "7777777771", 
        email: "", 
        vehicle_number: "NOEML01", 
        vehicle_type: "sedan" 
      })
    });

    let noEmailCustomerId = null;
    if (createCustomerRes.ok) {
      const data = await createCustomerRes.json();
      noEmailCustomerId = data.id;
      console.log(`  Success: Created customer with no email. ID: ${noEmailCustomerId}`);
      
      // Give them some points and an offer
      await db.execute({
        sql: `UPDATE customers SET points_balance = 500 WHERE id = ?`,
        args: [noEmailCustomerId]
      });
    } else {
      console.log(`  Failed: Response ${createCustomerRes.status}`);
      console.log(await createCustomerRes.text());
    }
    console.log("");

    // Setup an offer
    const serviceRes = await db.execute("SELECT id FROM services LIMIT 1");
    const serviceId = serviceRes.rows[0].id;
    const offerRes = await db.execute(`SELECT id FROM offers WHERE branch_id = ? LIMIT 1`, [mgr.branch_id]);
    let offerId = null;
    if (offerRes.rows.length === 0) {
      const newOfferId = `test-offer-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO offers (id, title, description, points_required, branch_id, is_active) VALUES (?, 'Test Offer', 'Desc', 100, ?, 1)`,
        args: [newOfferId, mgr.branch_id]
      });
      offerId = newOfferId;
    } else {
      offerId = offerRes.rows[0].id;
    }

    // 2. Confirm redemption without email is rejected.
    if (noEmailCustomerId && offerId) {
      console.log("[2] Request OTP (No Email Customer):");
      const requestOtpRes = await fetch(`${BASE_URL}/api/manager/redemptions/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cookie": fullCookie },
        body: JSON.stringify({ customer_id: noEmailCustomerId, offer_id: offerId })
      });

      if (requestOtpRes.status === 400) {
        const data = await requestOtpRes.json();
        console.log(`  Success: Rejected with message: "${data.error}"`);
      } else {
        console.log(`  Failed: Expected 400, got ${requestOtpRes.status}`);
        console.log(await requestOtpRes.text());
      }
    }
    console.log("");

    // 3. Confirm redemption works end-to-end for a customer WITH an email.
    console.log("[3] Request OTP (With Email Customer):");
    const createEmailCustomerRes = await fetch(`${BASE_URL}/api/manager/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": fullCookie },
      body: JSON.stringify({ 
        name: "Email Customer", 
        phone: "7777777772", 
        email: "test@example.com", 
        vehicle_number: "EML0001", 
        vehicle_type: "suv" 
      })
    });

    let emailCustomerId = null;
    if (createEmailCustomerRes.ok) {
      const data = await createEmailCustomerRes.json();
      emailCustomerId = data.id;
      await db.execute({
        sql: `UPDATE customers SET points_balance = 500 WHERE id = ?`,
        args: [emailCustomerId]
      });

      const requestOtpEmailRes = await fetch(`${BASE_URL}/api/manager/redemptions/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cookie": fullCookie },
        body: JSON.stringify({ customer_id: emailCustomerId, offer_id: offerId })
      });

      if (requestOtpEmailRes.ok) {
        console.log(`  Success: Request OTP API returned OK for customer with email.`);
      } else {
        console.log(`  Failed: Expected 200, got ${requestOtpEmailRes.status}`);
        console.log(await requestOtpEmailRes.text());
      }
    } else {
      console.log(`  Failed to create email customer.`);
    }

    console.log("\nCleaning up test data...");
    if (noEmailCustomerId) {
      await db.execute({ sql: `DELETE FROM vehicles WHERE customer_id = ?`, args: [noEmailCustomerId] });
      await db.execute({ sql: `DELETE FROM customers WHERE id = ?`, args: [noEmailCustomerId] });
    }
    if (emailCustomerId) {
      await db.execute({ sql: `DELETE FROM vehicles WHERE customer_id = ?`, args: [emailCustomerId] });
      await db.execute({ sql: `DELETE FROM customers WHERE id = ?`, args: [emailCustomerId] });
    }
    if (offerId?.startsWith('test-offer-')) {
      await db.execute({ sql: `DELETE FROM offers WHERE id = ?`, args: [offerId] });
    }

    console.log("Done.");

    console.log("\n=== VERIFICATION COMPLETE ===");
  } catch (e) {
    console.error(e);
  } finally {
    db.close();
  }
}

verify();
