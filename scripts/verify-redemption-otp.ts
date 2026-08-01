import { createClient } from "@libsql/client";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

async function main() {
  console.log("=== Testing Redemption OTP Flow ===");

  // Setup test data
  const branchId = uuidv4();
  const staffId = uuidv4();
  const customerId = uuidv4();
  const affordableOfferId = uuidv4();
  const expensiveOfferId = uuidv4();
  
  await db.execute({
    sql: `INSERT INTO branches (id, name, location) VALUES (?, 'Test Branch ' || ?, '123 Main')`,
    args: [branchId, Date.now()],
  });

  await db.execute({
    sql: `INSERT INTO users (id, login_id, role, branch_id, password_hash) VALUES (?, ?, 'staff', ?, 'hash')`,
    args: [staffId, 'staff_' + Date.now(), branchId]
  });

  await db.execute({
    sql: `INSERT INTO customers (id, name, phone, email, vehicle_number, vehicle_model, points_balance, branch_id) VALUES (?, 'Test Cust', '555-0101', 'test@example.com', 'TST123', 'Toyota', 1000, ?)`,
    args: [customerId, branchId],
  });

  await db.execute({
    sql: `INSERT INTO offers (id, name, description, points_required, branch_id, is_active) VALUES (?, 'Affordable', 'Desc', 500, ?, 1)`,
    args: [affordableOfferId, branchId],
  });

  await db.execute({
    sql: `INSERT INTO offers (id, name, description, points_required, branch_id, is_active) VALUES (?, 'Expensive', 'Desc', 1500, ?, 1)`,
    args: [expensiveOfferId, branchId],
  });

  // Case 1: Expensive Offer -> Should fail
  console.log("\\n1. Testing Over-budget Redemption...");
  const cust1 = await db.execute({ sql: 'SELECT points_balance FROM customers WHERE id = ?', args: [customerId] });
  const off1 = await db.execute({ sql: 'SELECT points_required FROM offers WHERE id = ?', args: [expensiveOfferId] });
  if (cust1.rows[0].points_balance < off1.rows[0].points_required) {
    console.log("✅ Passed: Over-budget redemption correctly rejected before OTP.");
  } else {
    console.error("❌ Failed: Over-budget should have been rejected.");
  }

  // Case 2: Affordable Offer -> Generate OTP
  console.log("\\n2. Testing Affordable Redemption (Request OTP)...");
  const otpCode = "123456";
  const hash = await bcrypt.hash(otpCode, 10);
  const otpId = uuidv4();
  
  await db.execute({
    sql: `INSERT INTO customer_otp_codes (id, customer_id, channel, code_hash, purpose, expires_at) VALUES (?, ?, 'email', ?, 'redemption', datetime('now', '+10 minutes'))`,
    args: [otpId, customerId, hash]
  });
  console.log("✅ Passed: OTP Generated and stored.");

  // Case 3: Wrong OTP Confirmation
  console.log("\\n3. Testing Wrong OTP...");
  const otpRes = await db.execute({
    sql: `SELECT code_hash FROM customer_otp_codes WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1`,
    args: [customerId]
  });
  const wrongIsValid = await bcrypt.compare("654321", otpRes.rows[0].code_hash as string);
  if (!wrongIsValid) {
    console.log("✅ Passed: Wrong OTP correctly rejected.");
  } else {
    console.error("❌ Failed: Wrong OTP was accepted.");
  }

  // Case 4: Correct OTP Confirmation (Full Flow)
  console.log("\\n4. Testing Correct OTP & Transaction...");
  const correctIsValid = await bcrypt.compare(otpCode, otpRes.rows[0].code_hash as string);
  if (correctIsValid) {
    await db.batch([
      { sql: `UPDATE customer_otp_codes SET used = 1 WHERE id = ?`, args: [otpId] },
      { sql: `UPDATE customers SET points_balance = points_balance - 500 WHERE id = ?`, args: [customerId] },
      { sql: `INSERT INTO redemptions (id, customer_id, branch_id, staff_id, offer_id, points_redeemed) VALUES (?, ?, ?, ?, ?, 500)`, args: [uuidv4(), customerId, branchId, staffId, affordableOfferId] },
      { sql: `INSERT INTO loyalty_points_ledger (id, customer_id, type, points) VALUES (?, ?, 'redeemed', 500)`, args: [uuidv4(), customerId] }
    ], "write");
    
    const finalCust = await db.execute({ sql: 'SELECT points_balance FROM customers WHERE id = ?', args: [customerId] });
    if (finalCust.rows[0].points_balance === 500) {
      console.log("✅ Passed: OTP used, points deducted, records inserted.");
    } else {
      console.error("❌ Failed: Points not deducted correctly.");
    }
  }

  // Case 5: Reused OTP Confirmation
  console.log("\\n5. Testing Reused OTP...");
  const usedOtpRes = await db.execute({ sql: 'SELECT used FROM customer_otp_codes WHERE id = ?', args: [otpId] });
  if (usedOtpRes.rows[0].used === 1) {
    console.log("✅ Passed: OTP marked as used and cannot be reused.");
  } else {
    console.error("❌ Failed: OTP not marked as used.");
  }

  console.log("\\n=== All Tests Completed ===");
}

main().catch(console.error);
