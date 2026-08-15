import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { parse } from "cookie";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const BASE_URL = "http://localhost:3000";

async function loginAs(role: "admin" | "staff") {
  let login_id = "";
  let password = "password";
  
  if (role === "admin") login_id = "test_admin";
  else if (role === "staff") login_id = "test_staff_a";

  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  
  const csrfSetCookies = csrfRes.headers.getSetCookie();
  const cookies = csrfSetCookies.map(c => c.split(';')[0]).join('; ');

  const params = new URLSearchParams();
  params.append("login_id", login_id);
  params.append("password", password);
  params.append("redirect", "false");
  params.append("csrfToken", csrfToken);

  params.append("json", "true");

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookies
    },
    body: params.toString()
  });

  const jsonRes = await loginRes.json();
  if (jsonRes.url && jsonRes.url.includes("error=")) {
    throw new Error(`Failed to login as ${role}: ${JSON.stringify(jsonRes)}`);
  }

  const setCookies = loginRes.headers.getSetCookie();
  if (!setCookies || setCookies.length === 0) {
    const text = await loginRes.text();
    console.error("Login failed. Status:", loginRes.status, "Body:", text, "Headers:", Array.from(loginRes.headers.entries()));
    throw new Error(`Failed to login as ${role}`);
  }
  
  // Extract just the name=value parts to form the Cookie header
  const sessionCookie = setCookies.map(c => c.split(';')[0]).join('; ');
  return sessionCookie;
}

async function main() {
  console.log("=== Offers & Combos Verification ===");
  
  const db = createClient({ url: process.env.LIBSQL_URL || "file:local.db" });
  
  // Get active services and a branch
  const servicesRes = await db.execute("SELECT id, price FROM services WHERE is_active = 1 LIMIT 2");
  if (servicesRes.rows.length < 2) throw new Error("Not enough active services to test");
  
  const branchRes = await db.execute("SELECT id FROM branches LIMIT 1");
  const branchId = branchRes.rows[0].id as string;
  
  const service1Id = servicesRes.rows[0].id as string;
  const service1Price = Number(servicesRes.rows[0].price);
  
  const service2Id = servicesRes.rows[1].id as string;
  const service2Price = Number(servicesRes.rows[1].price);

  console.log("Logging in as Admin...");
  const adminCookie = await loginAs("admin");
  
  console.log("Logging in as Staff...");
  let staffCookie = "";
  try {
    staffCookie = await loginAs("staff");
  } catch(e) {
    console.log("Warning: Could not login as staff1@magma.com, skipping 403 checks");
  }

  // 1. Create a service offer scoped to "All Branches"
  console.log("\\n1. Testing 'All Branches' Service Offer creation...");
  const allBranchesRes = await fetch(`${BASE_URL}/api/admin/service-offers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": adminCookie },
    body: JSON.stringify({
      service_id: service1Id,
      offer_price: service1Price - 10,
      branch_id: "",
      is_active: true
    })
  });
  const allBranchesData = await allBranchesRes.json();
  if (allBranchesData.success) {
    const dbCheck = await db.execute("SELECT branch_id FROM service_offers WHERE id = ?", [allBranchesData.id]);
    if (dbCheck.rows[0].branch_id === null) {
      console.log("✅ Successfully created 'All Branches' offer (branch_id is NULL)");
    } else {
      console.error("❌ branch_id is not NULL!");
    }
  } else {
    console.error("❌ Failed to create offer:", allBranchesData);
  }

  // 2. Create one scoped to a specific branch
  console.log("\\n2. Testing Specific Branch Service Offer creation...");
  const specBranchRes = await fetch(`${BASE_URL}/api/admin/service-offers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": adminCookie },
    body: JSON.stringify({
      service_id: service2Id,
      offer_price: service2Price - 10,
      branch_id: branchId,
      is_active: true
    })
  });
  const specBranchData = await specBranchRes.json();
  if (specBranchData.success) {
    const dbCheck = await db.execute("SELECT branch_id FROM service_offers WHERE id = ?", [specBranchData.id]);
    if (dbCheck.rows[0].branch_id === branchId) {
      console.log(`✅ Successfully created scoped offer (branch_id: ${branchId})`);
    } else {
      console.error("❌ branch_id mismatch!");
    }
  } else {
    console.error("❌ Failed to create offer:", specBranchData);
  }

  // 3. Reject offer_price >= normal price
  console.log("\\n3. Testing invalid offer price (higher than original)...");
  const invalidPriceRes = await fetch(`${BASE_URL}/api/admin/service-offers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": adminCookie },
    body: JSON.stringify({
      service_id: service1Id,
      offer_price: service1Price + 50,
      branch_id: "",
      is_active: true
    })
  });
  if (invalidPriceRes.status === 400) {
    const data = await invalidPriceRes.json();
    console.log("✅ Successfully rejected with 400:", data.error);
  } else {
    console.error(`❌ Expected 400, got ${invalidPriceRes.status}`);
  }

  // 4. Create a combo with 2+ services
  console.log("\\n4. Testing Combo creation (2 services)...");
  const comboRes = await fetch(`${BASE_URL}/api/admin/combos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": adminCookie },
    body: JSON.stringify({
      name: "Super Combo",
      description: "A test combo",
      bundle_price: 1500,
      branch_id: "",
      services: [service1Id, service2Id],
      is_active: true
    })
  });
  const comboData = await comboRes.json();
  if (comboData.success) {
    const dbCheckCombo = await db.execute("SELECT bundle_price FROM combos WHERE id = ?", [comboData.id]);
    const dbCheckServices = await db.execute("SELECT COUNT(*) as c FROM combo_services WHERE combo_id = ?", [comboData.id]);
    
    if (dbCheckCombo.rows[0].bundle_price === 1500 && dbCheckServices.rows[0].c === 2) {
      console.log("✅ Successfully created combo with bundle_price stored separately and 2 linked services");
    } else {
      console.error("❌ DB structure for combo is wrong");
    }
  } else {
    console.error("❌ Failed to create combo:", comboData);
  }

  // 5. Reject Combo with < 2 services
  console.log("\\n5. Testing invalid combo (1 service)...");
  const invalidComboRes = await fetch(`${BASE_URL}/api/admin/combos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": adminCookie },
    body: JSON.stringify({
      name: "Bad Combo",
      description: "",
      bundle_price: 500,
      branch_id: "",
      services: [service1Id],
      is_active: true
    })
  });
  if (invalidComboRes.status === 400) {
    const data = await invalidComboRes.json();
    console.log("✅ Successfully rejected with 400:", data.error);
  } else {
    console.error(`❌ Expected 400, got ${invalidComboRes.status}`);
  }

  // 6. Test 403 on write endpoints for staff
  if (staffCookie) {
    console.log("\\n6. Testing 403 Authorization for non-Admin...");
    
    const staffOfferRes = await fetch(`${BASE_URL}/api/admin/service-offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": staffCookie },
      body: JSON.stringify({ service_id: service1Id, offer_price: 1, branch_id: "", is_active: true })
    });
    
    const staffComboRes = await fetch(`${BASE_URL}/api/admin/combos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": staffCookie },
      body: JSON.stringify({ name: "hax", bundle_price: 1, branch_id: "", services: [service1Id, service2Id] })
    });
    
    if (staffOfferRes.status === 403 && staffComboRes.status === 403) {
      console.log("✅ Successfully blocked non-Admin with 403 Forbidden");
    } else {
      console.error("❌ Staff authorization check failed", staffOfferRes.status, staffComboRes.status);
    }
  }
}

main().catch(console.error);
